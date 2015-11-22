
/* Test application for the garbage collector
 * Licensing information can be found in the LICENSE file
 * (C) 2013 Licker Nandor. All rights reserved.
 */
#include "heap.h"

/**
 * Object allocated on the heap
 * Every object adds an 12 byte overhead
 */
typedef struct
{
  /* Metadata, 64 bits overhead */
  struct
  {
    /* Mark flag used by the mark phase */
    uint8_t mark;

    /* Number of survived gc cycles */
    uint8_t age;

    /* Size of the chunk in bytes */
    uint32_t size;

    /* Relocated address */
    uint32_t addr;
  };

  /* Object data, zero-length array hack */
  uint8_t data[0];
} chunk_t;

/**
 * Computes heap memory usage and stores it in heap->heap_size
 * @param heap
 *    Pointer to the heap structure
 */
static inline void
compute_heap_size(struct heap *heap)
{
  heap->heap_size = heap->eden_size + heap->survivor_size +
                    heap->tenured_size + heap->perm_size;
}

/**
 * Marking phase. Marks a chunk as visited using a depth-first traversal
 * @note
 *    This function is recursive
 * @param heap
 *    Pointer to the heap structure
 * @param ref
 *    Reference to an object
 */
static void
mark_chunk(struct heap *heap, uint8_t **ref)
{
  chunk_t *chunk = (chunk_t*)(*ref - sizeof(chunk_t));

  if (chunk->mark)
  {
    return;
  }

  chunk->mark ^= 1;
  (*heap->visitor) (heap, ref, mark_chunk);
}

/**
 * Readdressing after a minor GC. After a minor GC, the size fields of
 * moved objects store the new location. All the references are updated to point
 * to the correct locations
 * @note
 *    This function is recursive
 * @param heap
 *    Pointer to the heap structure
 * @param ref
 *    Reference to an object
 */
static void
fix_minor(struct heap *heap, uint8_t **ref)
{
  chunk_t *chunk = (chunk_t*)(*ref - sizeof(chunk_t));

  if (chunk->addr)
  {
    *ref = heap->heap + chunk->addr + sizeof(chunk_t);
  }

  if (!chunk->mark)
  {
    return;
  }

  chunk->mark ^= 1;
  (*heap->visitor) (heap, ref, fix_minor);
}

/**
 * Fix after compacting
 * to the correct locations
 * @note
 *    This function is recursive
 * @param heap
 *    Pointer to the heap structure
 * @param ref
 *    Reference to an object
 */
static void
fix_major(struct heap *heap, uint8_t **ref)
{

}

/**
 * Places a chunk at the end of eden area
 * @param heap
 *    Pointer to the heap structure
 * @param size
 *    Size of the object
 * @return
 *    A reference to the object or NULL if allocation failed
 */
static inline chunk_t *
chunk_eden_alloc(struct heap *heap, uint32_t size)
{
  chunk_t *chunk;

  assert(heap);
  if (heap->eden_size + size >= heap->eden_max_size)
  {
    return NULL;
  }

  /* Allocate chunk */
  chunk = (chunk_t*)(heap->eden_ptr + heap->eden_size);
  chunk->size = size;
  chunk->age = 0;
  chunk->mark = 0;

  /* Adjust memory usage */
  heap->eden_size += size;
  heap->heap_size += size;

  return chunk;
}

/**
 * Places a chunk at the end of tenured area
 * @param heap
 *    Pointer to the heap structure
 * @param size
 *    Size of the object
 * @return
 *    A reference to the object or NULL if allocation failed
 */
static inline chunk_t *
chunk_tenured_alloc(struct heap *heap, uint32_t size)
{
  chunk_t *chunk;

  assert(heap);

  if (heap->tenured_size + size >= heap->tenured_max_size)
  {
    return NULL;
  }

  /* Allocate chunk */
  chunk = (chunk_t*)(heap->tenured_ptr + heap->tenured_size);
  chunk->size = size;
  chunk->age = 0;
  chunk->mark = 0;

  /* Adjust memory usage */
  heap->tenured_size += size;
  heap->heap_size += size;

  return chunk;
}

/**
 * Computes compacted addresses for a whole region. Requires live objects to
 * be marked first.
 *
 * @param heap
 *    Reference to the heap structure
 * @param start
 *    Start of the region
 * @param size
 *    Size of the region
 */
static void
address_region(struct heap *heap, uint8_t *start, uint32_t *size)
{
  assert(heap && 0);
}

/**
 * Collects garbage from a memory region. Assumes that are live objects are
 * marked. This function only places a new address in the address field,
 *
 * @param heap
 *    Reference to the heap structure
 * @param start
 *    Start of the region
 * @param size
 *    Size of the region
 */
static void
compact_region(struct heap *heap, uint8_t *start, uint32_t *size)
{
  assert(heap && 0);
}

/**
 * Performs a major GC
 * @param heap
 *    Pointer to the heap structure
 */
static void
major_gc(struct heap *heap)
{
  assert(heap);

  /* Mark live objects */
  mark_chunk(heap, &heap->root);

  /* Compute addresses */
  address_region(heap, heap->tenured_ptr, &heap->tenured_size);
  address_region(heap, heap->perm_ptr, &heap->perm_size);

  /* Fix up references */
  fix_major(heap, &heap->root);

  /* Copy objects */
  compact_region(heap, heap->tenured_ptr, &heap->tenured_size);
  compact_region(heap, heap->perm_ptr, &heap->perm_size);
}

/**
 * Does a minor GC run. Returns 1 if a major GC is to be run.
 * A minor GC removes all dead objects from eden and the survivor area.
 * Objects that pass a certain age are moved from the survivor area into
 * the tenured area as long as there's place for them.
 * If young objects don't all fit inside the survivor area, they overflow
 * into the tenured one.
 * If there is no space for young objects in the tenured area, a major GC
 * is triggered.
 *
 * @param heap
 *    Pointer to the heap structure
 * @returns
 *    > 0 if a major GC is required, 0 otherwise
 */
static int
minor_gc(struct heap *heap)
{
  chunk_t *src, *dst;
  uint8_t *survivor;
  uint32_t new_size;

  /* Sanitise arguments */
  assert(heap);

  /* Mark all chunks that are not garbage */
  mark_chunk(heap, &heap->root);

  /* Choose target survivor space */
  survivor = heap->s_ptr[heap->survivor ^ 1];

  /* Move objects from one survivor space to another
     or move aged objects into the tenured area */
  if (heap->survivor_size > 0)
  {
    /* If survivors wouldn't fit into tenured space, do a major gc instead */
    src = (chunk_t*)heap->s_ptr[heap->survivor];
    new_size = 0;

    /* Loop through all objects in the survivor pool */
    while ((uint8_t*)src - heap->s_ptr[heap->survivor] < heap->survivor_size)
    {
      /* Survivor object not marked, discard it */
      if (!src->mark)
      {
        src = (chunk_t*)((uint8_t*)src + src->size);
        continue;
      }

      /* Survivor is old enough & there is space in tenured */
      if (src->age >= heap->age_cycles &&
          heap->tenured_size + src->size < heap->tenured_max_size)
      {
        dst = (chunk_t*)(heap->tenured_ptr + heap->tenured_size);
        heap->tenured_size += src->size;
      }
      else
      {
        /* Transfer other survivor */
        dst = (chunk_t*)(survivor + new_size);
        new_size += src->size;

        /* Should have gone to tenured, but we managed to work around
           the problem. We signal the runtime that it would be nice
           to do a major collection */
        heap->gc += src->age >= heap->age_cycles;
      }

      /* Actual transfer */
      memcpy(dst, src, src->size);
      dst->age = dst->age == 0xFF ? 0xFF : (dst->age + 1);

      /* Mark it as moved & save new address in size field
         so the second traversal can recompute the address */
      src->addr = ((uint8_t*)dst - heap->heap);
      dst->mark = 0;

      /* Move on to the next object */
      src = (chunk_t*)((uint8_t*)src + dst->size);
      continue;
    }

    heap->survivor_size = new_size;
  }

  /* Swap survivor pools */
  heap->survivor ^= 1;

  /* Move objects from minor generation into survivor space */
  src = (chunk_t*)heap->eden_ptr;
  while ((uint8_t*)src - heap->eden_ptr < heap->eden_size)
  {
    if (src->mark)
    {
      if (src->size + heap->survivor_size < heap->survivor_max_size)
      {
        /* If object fits into survivor space, copy it there */
        dst = (chunk_t*)(survivor + heap->survivor_size);
        heap->survivor_size += src->size;
      }
      else if (heap->tenured_size + src->size < heap->tenured_max_size)
      {
        /* If object cannot be transferred to survivor space,
         * overflow to tenured. */
        dst = (chunk_t*)(heap->tenured_ptr + heap->tenured_size);
        heap->tenured_size += src->size;

      }
      else
      {
        /* Tricky case. We have to do something with objects from eden,
           but we do not have enough temp space left. So we fix up existing
           references and then proceed to clear thrash out of eden by
           compacting it. We do this to keep eden consistent & as
           compact as possible */
        fix_minor(heap, &heap->root);

        /* Very similar to a major gc, but on a smaller data set */
        mark_chunk(heap, &heap->root);
        address_region(heap, heap->eden_ptr, &heap->eden_size);
        fix_major(heap, &heap->root);
        compact_region(heap, heap->eden_ptr, &heap->eden_size);

        heap->gc += heap->gc_delay;
      }

      memcpy(dst, src, src->size);
      src->addr = ((uint8_t*)dst - heap->heap);
      dst->mark = 0;
      dst->age = 1;
    }

    /* Move on to next chunk */
    src = (chunk_t*)((uint8_t*)src + src->size);
  }

  /* Fix addresses after relocation */
  fix_minor(heap, &heap->root);

  /* In the end, eden will be empty */
  heap->eden_size = 0;
  compute_heap_size(heap);
}

/**
 * Allocates a new chunk on the heap. There is a slightly big chace of failure
 * if objects are very large and pools are disproportionately small.
 * @param heap
 *    Reference to the heap struct
 * @param size
 *    Size of the whole chunk (object + gc metadata)
 * @return
 *    NULL if there is not enough memory to fit the object
 */
static chunk_t *
chunk_alloc(struct heap *heap, uint32_t size)
{
  chunk_t *chunk;
  uint8_t major_done = 0;

  /* If object is really large (larger than half of eden or survivor space),
     try to place it directly into the tenured area. If it doesn't fit into
     tenured, we resort to the normal strategy. */
  if ((size >= (heap->eden_max_size >> 1) ||
       size >= (heap->survivor_max_size >> 1)) &&
      (chunk = chunk_tenured_alloc(heap, size)))
  {
    return chunk;
  }

  /* If object fits in eden, put it there */
  if (!(chunk = chunk_eden_alloc(heap, size)))
  {
    /* Not enough space in eden, do a minor gc and try to place object.
       The minor gc might trigger a major one if it does not have enough
       free working space */
    if (heap->gc >= heap->gc_delay)
    {
      major_gc(heap);
      major_done = 1;
      heap->gc = 0;
    }

    /* Push objects from minor to survivor/tenured */
    minor_gc(heap);

    /* See if the minor GC freed up enough space */
    if (!(chunk = chunk_eden_alloc(heap, size)))
    {
      if (!major_done)
      {
        /* Nope, do a major one */
        major_gc(heap);
      }

      return chunk_tenured_alloc(heap, size);
    }
  }

  /* Valid chunk of memory */
  return chunk;
}

/**
 * Initialises the heap
 * @param heap
 *    Pointer to the heap structure
 */
void
heap_init(struct heap *heap)
{
  assert(heap);
  assert(heap->eden_max_size > 0);
  assert(heap->survivor_max_size > 0);
  assert(heap->tenured_max_size > 0);
  assert(heap->perm_max_size > 0);

  /* Allocate memory */
  heap->heap_max_size = heap->eden_max_size +
                        heap->survivor_max_size * 2 +
                        heap->tenured_max_size +
                        heap->perm_max_size;
  assert((heap->heap = (uint8_t*)malloc(heap->heap_max_size)));

  /* Zero out memory */
  heap->eden_size = 0;
  heap->survivor_size = 0;
  heap->tenured_size = 0;
  heap->perm_size = 0;
  heap->heap_size = 0;
  heap->survivor = 0;

  /* Init pointers to regions */
  heap->eden_ptr = heap->heap;
  heap->s_ptr[0] = heap->eden_ptr + heap->eden_max_size;
  heap->s_ptr[1] = heap->s_ptr[0] + heap->survivor_max_size;
  heap->tenured_ptr = heap->s_ptr[1] + heap->survivor_max_size;
  heap->perm_ptr = heap->tenured_ptr + heap->tenured_max_size;
}

/**
 * Frees all objects on the heap
 * @param heap
 *    Pointer to the heap structure
 */
void
heap_destroy(struct heap *heap)
{
  assert(heap);

  if (heap->heap)
  {
    free(heap->heap);
    heap->heap = NULL;
  }
}

/**
 * Allocates an object on the heap
 * @param heap
 *    Pointer to the heap structure
 * @param size
 *    Size of the object to be allocated
 */
uint8_t *
heap_alloc(struct heap *heap, uint32_t size)
{
  chunk_t *chunk;

  if ((chunk = chunk_alloc(heap, size + sizeof(chunk_t))))
  {
    memset(&chunk->data[0], 0, size);
    return &chunk->data[0];
  }
  else
  {
    return NULL;
  }
}
heap.h
/* Test application for the garbage collector
 * Licensing information can be found in the LICENSE file
 * (C) 2013 Licker Nandor. All rights reserved.
 */
#ifndef __HEAP_H__
#define __HEAP_H__

#include <stdlib.h>
#include <assert.h>
#include <string.h>
#include <stdint.h>

/**
 * Forward declaration of the heap structure
 */
struct heap;

/**
 * Internal function which processes all references
 */
typedef void (*ref_visitor) (struct heap *, uint8_t **);

/**
 * Visitor function used by the mark phase
 */
typedef void (*obj_visitor) (struct heap *, uint8_t **, ref_visitor);

/**
 * Heap space
 */
struct heap
{
  /* Max heap space */
  uint32_t eden_max_size;
  uint32_t survivor_max_size;
  uint32_t tenured_max_size;
  uint32_t perm_max_size;
  uint32_t heap_max_size;

  /* Number of surviving cycles */
  uint8_t age_cycles;

  /* How many minor collections can partially fail */
  uint8_t gc_delay;

  /* Actually occupied heap space */
  uint32_t eden_size;
  uint32_t survivor_size;
  uint32_t tenured_size;
  uint32_t perm_size;
  uint32_t heap_size;

  /* Current survivor area */
  uint8_t survivor;

  /* Heap memory */
  uint8_t *heap;

  /* Says it's high time to collect */
  uint8_t gc;

  /* Region start addresses */
  uint8_t *eden_ptr;
  uint8_t *s_ptr[2];
  uint8_t *tenured_ptr;
  uint8_t *perm_ptr;

  /* Root heap object */
  uint8_t *root;

  /* Object visitor */
  obj_visitor visitor;
};

/**
 * Initialises the heap
 */
void heap_init(struct heap *heap);

/**
 * Cleanup code
 */
void heap_destroy(struct heap *heap);

/**
 * Allocates an object on the heap and returns a reference to it
 */
uint8_t *heap_alloc(struct heap *heap, uint32_t size);

#endif /*__HEAP_H__*/
test.c
/* Test application for the garbage collector
 * Licensing information can be found in the LICENSE file
 * (C) 2013 Licker Nandor. All rights reserved.
 */
#include <stdio.h>
#include "heap.h"

/**
 * Object containing multiple references & a small flag
 */
typedef struct
{
  uint32_t data;
  uint32_t count;
  uint8_t *refs[0];
} object_t;

/**
 * Allocates a new object
 */
uint8_t *
object_alloc(struct heap *heap, uint32_t data, uint32_t size)
{
  object_t *obj;
  uint32_t mem;
  uint32_t i;

  /* Allocate memory & obtain a reference */
  mem = sizeof(object_t) + size * sizeof(uint8_t*);
  if (!(obj = (object_t*)heap_alloc(heap, mem)))
  {
    /* Allocation failed */
    return NULL;
  }

  /* Fill out object data */
  obj->data = data;
  obj->count = size;

  /* Set all refs to null */
  for (i = 0; i < size; ++i)
  {
    obj->refs[i] = NULL;
  }

  return (uint8_t*)obj;
}

/**
 * Sets a reference in the object
 */
void
object_set(uint8_t *ref, uint32_t idx, uint8_t *val)
{
  object_t *obj;

  assert((obj = (object_t*)ref));
  assert(idx < obj->count);

  obj->refs[idx] = val;
}

/**
 * Visits the children of an object
 */
void
object_visitor(struct heap *heap, uint8_t **ref, ref_visitor v)
{
  object_t *obj;
  uint32_t i;

  assert((obj = (object_t*)*ref));
  printf("{%d} ", obj->data);
  for (i = 0; i < obj->count; ++i)
  {
    if (obj->refs[i] != NULL)
    {
      (*v) (heap, &obj->refs[i]);
    }
  }
}

/**
 * Entry point of the test application
 */
int
main()
{
  struct heap heap;
  uint8_t *root, *temp;
  uint32_t i = 0, j = 0;

  /* Initialises the heap */
  memset(&heap, 0, sizeof(heap));
  heap.eden_max_size = 2 << 9;      /* 2Kb */
  heap.survivor_max_size = 1 << 9;  /* 1Kb * 2 = 2Kb */
  heap.tenured_max_size = 4 << 9;   /* 2Kb */
  heap.perm_max_size = 5 << 9;      /* 5Kb */
  heap.age_cycles = 2;              /* Promotion to tenured after 2 GCs */
  heap.gc_delay = 3;
  heap.visitor = object_visitor;
  heap_init(&heap);

  /* Create a really long list */
  for (j = 1; j <= 5; ++j)
  {
    heap.root = root = object_alloc(&heap, 100 * j, 1);
    for (i = 1; i <= 100; ++i)
    {
      printf("%d %d/%d %d/%d %d/%d\n", i,
             heap.eden_size, heap.eden_max_size,
             heap.survivor_size, heap.survivor_max_size,
             heap.tenured_size, heap.tenured_max_size);

      if ((temp = object_alloc(&heap, 100 * j + i, 1)) == NULL)
      {
        fprintf(stderr, "Out of memory\n");
        heap_destroy(&heap);
        return EXIT_FAILURE;
      }

      object_set(temp, 0, heap.root);
      heap.root = temp;
    }
  }

  heap_destroy(&heap);
  return EXIT_SUCCESS;
}