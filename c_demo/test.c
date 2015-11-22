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
