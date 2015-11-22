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
