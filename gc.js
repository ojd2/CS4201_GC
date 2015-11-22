/**
 * Generational Garbage Collection technique.
 *
 *
 * - C++ GC Methods:
 *
 * - Main points of GC: http://www.codeproject.com/Articles/1060/Garbage-Collection-in-NET (generations)
 * - Using the hboehm Garbage Collector: http://www.hboehm.info/gc/simple_example.html
 * - Heap : https://gist.github.com/nandor/ef9052412e5ccc301a64
 *
 * - JavaScript GC Methods:
 *
 * - Mark and Sweep GC: https://gist.github.com/DmitrySoshnikov/4391763
 * - Reference Counting (ARC) https://gist.github.com/DmitrySoshnikov/4646658
 * - Stop and Copy GC: https://gist.github.com/DmitrySoshnikov/4736334
 * - Non-recursive DFS and BFS: https://gist.github.com/DmitrySoshnikov/63f9acfac4651da5d21f
 * 
 * - Research Papers:
 * - Generation Scavenging Algorithm by Ungar: http://www.cs.utexas.edu/users/mckinley/395Tmm-2003/talks/Ungar.pdf
 * - Incremental, Generational Mostly-Copying GC: http://www.hpl.hp.com/techreports/Compaq-DEC/WRL-91-8.pdf
 * - A tour of the V8 GC engine: http://jayconrod.com/posts/55/a-tour-of-v8-garbage-collection
 *
 *
 */

// ---------------------------------------------------------------------------
// I. Overall Goal for our Generational Garbage Collection program.
// ---------------------------------------------------------------------------

// To optimize for this algorithm, memory is managed in generations which simply 
// holds various objects of different ages. Garbage collection occurs in each generation when 
// the generation fills up. Objects are allocated in a generation for younger objects or 
// the young generation, and because of infant mortality most objects die there. 
// When the young generation fills up it causes a minor collection. 
// Minor collections can be optimized assuming a high infant mortality rate. 

// To put the following program into perspective, first the program should use some simple
// Heap structure, memory, allocation and object referencing functions. 
// These can then be broken into two generations: 'old_space' (old_generation), 
// 'new_space' (young_generation). The young generation: Most of the newly created objects 
// are located here. The old generation: Objects that did not become unreachable / survived 
// the young generation are copied here. When objects disappear from the young generation: 
// we say a 'minor GC' has occurred. When objects disappear from the old generation: we say a 
// 'major GC' (or a 'full GC') has occurred. There are a number of different algorithms that
// incrementally perform this proceedure. For example, the traditional "mark and sweep" algorithm, 
// however this lacksany generational proceedure. Rather the algorithm, uses traversing methods
// over unreachable and reachable objects in the heap. This is known as the 'marking phase',
// - subsequently, the 'sweep' phase occurs soon after. Sweeping takes all the unreachable objects 
// and assigns them too an empty space. Other various algorthims have derived from 'mark and sweep'.

// The program below is derived from various 'tracing collection' techniques and implemented variation
// of the improved 'stop and copy' algorithm. Other generational aspects are derived from the famous
// Generation Scavenging Algorithm by Ungar which is an implemented version of Cheney's algorithm:

// 1. Each object is classified as new or old
// 2. Old objects reside in memory region called old area
// 3. New objects can be found in following places:
// 		- New Space
// 		- Past Survivor Space
// 		- Future Survivor Space
// 		- Remembered Set : Set of old objects having a reference to new object
// 5. All new objects are reachable through Remembered Set objects and roots
// 6. During GC, live objects from NewSpace and PastSurvivorSpace are  moved to Future Survivor Space
// 7. Interchange FutureSurvivorSpace with Past Survivor Space
// 8. New Space can be reused for new objects
// 9. Space cost of only 1bit/object
// 10. Tenuring : promotion from new space to old space


// ---------------------------------------------------------------------------
// 1. Heap structure, allocation and reachability.
// ---------------------------------------------------------------------------

// Firstly, we must establish our 'heap', which will contain several 'boxed' elements.
// We can pull out elements from the ARC program. ARC is used as a simple technique of 
// storing the number of references, pointers, or handles to a resource such as an 
// object, block of memory, disk space or other resource. Essentially, we need somewhere
// to store our objects and references. Each address at which an object is stored will 
// be located inside our heap array below.

var heap = Array(20); // heap of size 20


// Now we can implment our heap division. The heap is divided into two spaces 
// for our objects to be assigned in. The old generation is where our <current objects> live. 
// The young generation in contrast is initially reserved for GC needs.

// For simplicity assuming the half of the heap array as a divider of
// the old Generation and new Generation: initially first half (0-9 indices) is Old Generation,
// the second half (indices 10-19) is New (mark it with two bars):

// Set up two variables for the two generational divisions and their indices.
// Reasons for doing this are because: In many programs, recently created objects are also 
// most likely to become unreachable incredibly quicker than first thought. 
// This is known as the infant mortality or the generational hypothesis.
// With generational GC's it is easier to divide our heap into two divisions 
// for this purpose. Therefore, many generational GC's use separate memory regions
// for different ages of objects.

var OLD_GENERATION_BOUND = 0; // current old generation (working) space.
var YOUNG_GENERATION_BOUND = 10; // start of the young generation space.

console.log(OLD_GENERATION_BOUND);
console.log(YOUNG_GENERATION_BOUND);

// Initially the allocation pointer is set to the beginning of the old generation (to zero).
var ALLOC_POINTER = OLD_GENERATION_BOUND;

// Set up a function which denotes allocation of various objects. 
// Then assign our objects and store onto the heap.
// The 'ALLOC_POINTER' returns object(s) back.
// We also explicitly keep the address on the object 
// the heap array index, where the object is allocated.
// Incrementally this increases the 'ALLOC_POINTER'.

function alloc_struct(object) {
	// Puts 'object' inside 'heap[ALLOC_POINTER]'
	heap[ALLOC_POINTER] = object;
	// Set up post-increment operator
	ALLOC_POINTER++;

	return object;
}

// Let's add some 'boxed' objects onto the heap.
// Object 'Int_const' is allocated at address 0 and is reachable
// from the 'root' index:
var Int_const = alloc_struct({a: 10});
console.log(Int_const);

// Object "String_const_long" is allocated at address 1 and is reachable
// from "Int_const" object:
var String_const_long = alloc_struct({b: 'Dictionary'});
// address (array index) where "String_const_long" is allocated on the heap:
Int_const['String_const_long'] = String_const_long['address']; 
console.log(String_const_long);

// Object "Bool_const_true" is allocated at address 2 and is also 
// reachable from "Int_const": root -> Int_const -> Bool_const_true
var Bool_const_true = alloc_struct({c: true});
// address (array index) where "Bool_const_true" is allocated on the heap:
Int_const['Bool_const_true'] = Bool_const_true['address']; 
console.log(Bool_const_true);

// However, later it's reference from "Int_const" is removed.
// Now "Bool_const_true" is a candidate for GC.
delete Int_const['Bool_const_true'];
console.log(Int_const);


// Object "String_const_short" is allocated at address 3 and is reachable from "String_const_long" (which in turn is
// reachable from "Int_const": root -> Int_const -> String_const_long -> String_const_short
var String_const_short = alloc_struct({d: 'Hello'});
// Like String_const_long.String_const_short = String_const_short in JS
String_const_long['String_const_short'] = String_const_short['address']; 

// But then the "String_const_long" reference is removed from "Int_const".
delete Int_const['String_const_long'];
console.log(Int_const);

// This means that "String_const_short" still has the reference to it from "String_const_long", 
// but it's not reachable (since the "b" itself is not reachable anymore).
// root: -> Int_const --X--> String_const_long -> String_const_short

// Notice the important point: that an object has some references to it
// doesn't mean it cannot be GC'ed. The criteria is "reachability", but not the
// reference counting here.

// Object "Bool_const_false" is allocated at address 4 and is reachable from "Int_const"
var Bool_const_false = alloc({e: false});
a.Bool_const_false = Bool_const_false['address'];
// And "Bool_const_false" also has back-reference to "Int_const".
Bool_const_false.Int_const = Int_const['address'];
console.log(Int_const);

// After these various assignments and deletions, the heap still contains five objects:
// [{Inst_const}, {String_const_long}, {Bool_const_true}, {String_const_short}, 
// {Bool_const_false}], but only "Inst_const" and "Bool_const_false" objects are reachable
// (this starting from the root, the "Inst_const" object).

// ---------------------------------------------------------------------------
// 2. Stop and Copy GC overall algorithm
// ---------------------------------------------------------------------------

