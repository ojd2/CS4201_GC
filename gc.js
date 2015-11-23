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
 * - Garbage Collection Algorithms - http://courses.cs.washington.edu/courses/csep521/07wi/prj/rick.pdf
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
// Object 'Int_const' is allocated at address 0
// This object is now 'reachable' from the 'root' index:
var Int_const = alloc_struct({a: 10});
console.log(Int_const);

// Object 'String_const_long' is allocated at address 1
// This object is now 'reachable' from the 'Int_const' object:
var String_const_long = alloc_struct({b: 'Dictionary'});
// The allocation uses the address (array index) 
// where "String_const_long" is allocated on the heap:
Int_const['String_const_long'] = String_const_long['address']; 
console.log(String_const_long);

// Object "Bool_const_true" is allocated at address 2
// The object is now 'reachable' from "Int_const": 
// e.g = root -> Int_const -> Bool_const_true
var Bool_const_true = alloc_struct({c: true});
// The allocation uses the address (array index) where "Bool_const_true"
// is allocated on the heap as follows:
Int_const['Bool_const_true'] = Bool_const_true['address']; 
console.log(Bool_const_true);

// Now, let us delete the 'Bool_const_true' reference from 'Int_const'
// Now 'Bool_const_true' is 'unreachable' and subsequently becomes a candidate for GC.
delete Int_const['Bool_const_true'];
console.log(Int_const);


// Object "String_const_short" is allocated at address 3
// The object is 'reachable' from 'String_const_long' 
// (which in turn is reachable from:
// 'Int_const': root -> Int_const -> String_const_long -> String_const_short
var String_const_short = alloc_struct({d: 'Hello'});
String_const_long['String_const_short'] = String_const_short['address']; 

// But then the 'String_const_long' object reference is removed from 'Int_const'.
delete Int_const['String_const_long'];
console.log(Int_const);

// Yet, let us not forget that 'String_const_short' still has the reference to it
// from "String_const_long", but it's not reachable (since the "b" itself is not reachable anymore).
// e.g = root: -> Int_const --//--> String_const_long -> String_const_short

// REMEMBER: that even when an object has some references to it, it doesn't
// mean it cannot be GC'ed. The criteria is "reachability", but not the
// reference counting here.

// Object 'Bool_const_false' is allocated at address 4 
// This becomes 'reachable' from the object 'Int_const'
var Bool_const_false = alloc_struct({e: false});
Int_const.Bool_const_false = Bool_const_false['address'];
// IMPORTANT: the object 'Bool_const_false' also has back-reference to 'Int_const':
Bool_const_false.Int_const = Int_const['address'];
console.log(Int_const);

// After various assignments and deletions, the passing of 'reachable' to 'unreachable', 
// the heap still contains five objects:
// Inst_const = a, String_const_long = b, Bool_const_true = c, String_const_short = d, 
// Bool_const_false = e, but remember, only the objects 
// 	- Inst_const 
//	- Bool_const_false 
// are now 'reachable' on the heap starting from the root index.

// ---------------------------------------------------------------------------
// 2. Stop and Copy GC, Fixing Pointer Issue and Fowarding Pointers
// ---------------------------------------------------------------------------

// In this moving Stop and Copy GC, all memory is divided into a "from space" and "to space".
// This particular program has allocated these partitions as young generation & old generation. 
// Initially, objects are allocated into a 'to space' until the space becomes full. 
// Next, a GC algorithm is triggered, below we highlight the Stop and Copy GC algorithm 
// which is a more redefined 'mark and sweep' algorithm.  

// Abstractly, there doesn't need to be any bit-for-bit copy inclusion. 
// Bit-for-bit inclusion would enable us to assign more detailed references.
// Because of this, there will be copying issues. As our abstract representation 
// does not cater for more precise references, therefore some properties of 
// objects may be referencing to other objects. 

// So after the copying we should try adjust all pointers and their objects to
// point to the new space where the objects were copied.
// A technique which may help us to solve this issue is a 'Forwarding Addresses'.
// This technique contains a special marker value which we can put on the object when copy it.

// At runtime, we can assign and mark the copied objects more efficiently 
// by forwarding addresses. This will update any other objects and their pointers 
// incrementally and we can denote markers accordingly by dividing the young generation 
// into three parts: 
// 	- Copied & Scanned objects *
// 	- Just copied objects *
// 	- And the Free space *

// Our new allocation pointers are set to the boundary of the
// 'old generation' and 'young generation' (that is, to the middle of our heap array).

// Allocate from the young generation now at GC:
ALLOC_POINTER = YOUNG_GENERATION_BOUND;
// And the Scanner pointer is set initially here too:
var SCANNER_POINTER = ALLOC_POINTER;

// Now let's set up a function to connect objects to their new locations.
function copyNewSpace(object) {
	// Now copy empty {}
	var newCopiedObject = {};
	for (var item in object) {
		if (item != 'address' && item != 'forwardingAddress') {
      		newCopiedObject[item] = object[item];
    	}
	}
	// Now mark the old object as copied:
	object['forwardingAddress'] = ALLOC_POINTER;
	// Put on the heap (which increases the alloc_struct pointer).
  	alloc_struct(newCopiedObject);
	return newCopiedObject;
}

// Now let's set up a function to check if value is an address:
// For abstraction the function and algorithm usees simplified versioning.
// We take the address in the heap array using its index (which are numbers). 
// E.g. Int_const.String_const_long = 1.
function isAddressPointer(name, value) {
  return typeof value == 'number' && name != 'address' && name != 'forwardingAddress';
}

// ---------------------------------------------------------------------------
// 3. Start the 'Stop & Copy' GC Phase
// ---------------------------------------------------------------------------

function gc_sc() {
  // Firstly, we must copy 'root' objects to the 'young generation'. 
  // We only have one reachable object here and that is the 'Int_const' object.
  // Therefore, we can do this by assigning our copyNewSpace(Int_const).
  // Let's copy it to the young generation, by automatically increasing the 
  // allocation pointer, but still keeping the scan pointer at its position.
  var copiedA = copyNewSpace(Int_const);
  Int_const['forwardingAddress'] = copiedA['address'];

  // From this, we have now differentiated our scanner and allocation pointers.
  // For now we have only the 'Int_const' object. During our scanning, we copy all 
  // these sub-objects and mark them as copied too (set the "forwarding address" flag).

	while (SCANNER_POINTER != ALLOC_POINTER) { 
  		// Get the next object within our Scanner pointer:
    	var nextObjectScan = heap[SCANNER_POINTER];
  		// Begin a simple traversal algorithm, checking all its reference properties
    	for (var p1 in nextObjectScan) if (isAddressPointer(p1, nextObjectScan[p1])) {
      
     		var address = nextObjectScan[p1]; 
     		// Get the object to which this reference points to:
      		var objectAtAddress = heap[address];

      		// If that object hasn't been copied yet (i.e. has no forwarding address set)
        	if (!('forwardingAddress' in objectAtAddress)) {
        	// Then we copy this sub-object as well and mark it specifying 'forwardingAddress'.
        	var copiedObjectAtAddress = copyNewSpace(objectAtAddress);
        	// And we also need the pointer value on the scanning object to
        	// refer to the new location.
        	nextObjectScan[p1] = copiedObjectAtAddress.address;
      		} 
      		// Else, the object which this sub-property refers to, was already copied at
      		// some previous scan of some other objects (an object can be referred by many
      		// properties in different objects)
      		else {
        		// Then we just update the pointer to the forwarding address
        		nextObjectScan[p1] = objectAtAddress.forwardingAddress;
      		}
    	}

    	// And then we move to the next object to scan (the sub-objects which were copied
    	// at scanning of their parent object, and which not scanned yet).
    	SCANNER_POINTER++;
	}
    
    // Now we can swap old and young spaces, making the young space our working
    // runtime memory, and the old space reserved for GC.
  	
    // Store our five live objects
  	var store = YOUNG_GENERATION_BOUND;

  	// Reset = 0 objects
  	YOUNG_GENERATION_BOUND = OLD_GENERATION_BOUND;
  	// Reset = 5 objects
  	OLD_GENERATION_BOUND = store;
  
  	
    

  


} // End gc_sc();


// ---------------------------------------------------------------------------
// 4. Pretty Print Our Results.
// ---------------------------------------------------------------------------
// Set up a function to convert our objects in the heap stack to a nice looking
// pretty print. For now, we will convert our outputs using a small function which
// converts our objects to a string.
function objectToString(object) {
    // Empty string array which will allow us to append our objects
    var empty_string = [];

    // Our heap is an array of objects. Therefore, the function below searches for
    // typeof 'object' and pushes elements into our empty_string[] array.
    // This is done first:
    if (typeof(object) == "object" && (object.join == undefined)) {
    	for (item in object) {
        	empty_string.push(item, ": ", objectToString(object[item]), "\n");
    	};
	}
	// Next we look for items if it is an array: 
	else if (typeof(object) == "object" && !(object.join == undefined)) {
	    for(item in object) {
	        empty_string.push(objectToString(object[item]), "\n");
	    }
	} 
	// If objects is a function
	else if (typeof(object) == "function") {
	    empty_string.push(object.toString(), "\n");
	} 
	// For all other other values can be done with JSON.stringify
	else {
	    empty_string.push(JSON.stringify(object), "\n");
	}
    // Return our results and values and join them simply to our empty_string[]
    return empty_string.join("");
}

// Before we console log some results...
// Notice, that the address of 'Bool_const_false' in the 'Int_const' object is 4, and
// the back-reference address of 'Int_const' on 'Bool_const_false' is 0.
// Let's show some implementated results:
console.log('HEAP BEFORE GC_SC:' + '\n\n', objectToString(heap));

// Now let's run the GC algorithm:
gc_sc();

// Now let's show some implemented results with the GC algorithm:
// Notice, that the address of 'Bool_const_false' object in the 'Int_const' is correctly
// updated to the new location, 11, and the the back-reference
// address of 'Int_const' on 'Bool_const_false' is 10.
console.log('HEAP AFTER GC_SC:' + '\n\n', objectToString(heap));


// ---------------------------------------------------------------------------
// 5. Mechanism to copy the newly assigned live data
// ---------------------------------------------------------------------------

// We need a mechanism to copy the live data of one region of memory to a 
// contiguous group of records in another region.

// This can be done without an auxiliary stack or queue; using the 'Cheney' 
// algorithm, which uses the destination region as the queue of a BF search:

// Strict stop-and-copy requires copying every live object from the source 
// heap to a new heap before you could free the old one, which translates 
// to lots of memory. With blocks, the GC can typically use dead blocks to 
// copy objects to as it collects. Each block has a generation count to keep
// track of whether it's alive. In the normal case, only the blocks created 
// since the last GC are compacted; all other blocks get their generation 
// count bumped if they have been referenced from somewhere. 

// This handles the normal case of lots of short-lived temporary objects. 
// Periodically, a full sweep is made - large objects are still not copied
// (just get their generation count bumped) and blocks containing small 
// objects are copied and compacted. This is where the "adaptive" part 
// comes in, so you end up with a mouthful: "adaptive generational 
// stop-and-copy."
  

function generation(object) {

// This follows the same routine for the copyToNewSpace() above ^^

// ALGORITHM:
// Take objects of simillar age. This would be the state of our heap
// after the GC_SC function has been called.
// Objects containing simillar age : [heap]

// 1 - Take all objects in [heap] (currently there will be)
// 2 - Divide and segment objects from [heap]
// 3 - Push all objects in [heap] into our first generation: G0.
// 3 - Push objects into older g1, g2 as they survive successive collection cycles.

// NOTE TO SELF: Am I right in thinking that I need too run the gc_sc function 
// within each G_0, G_1, G_2 etc.

	var G_0 = [];
	var G_1 = [];
	var G_2 = [];
	
	// Pull elements from 
	if (typeof(object) == "object" && (object.join == undefined)) {
    	for (item in object) {
        	G_0.push(item, ": ", generation(object[item]), "\n");
    	};
	}
	// Next we look for items if it is an array: 
	else if (typeof(object) == "object" && !(object.join == undefined)) {
	    for(item in object) {
	        G_0.push(generation(object[item]), "\n");
	    }
	} 
	// If objects is a function
	else if (typeof(object) == "function") {
	    G_0.push(object.toString(), "\n");
	} 
	// For all other other values can be done with JSON.stringify
	else {
	    G_0.push(JSON.stringify(object), "\n");
	}
    // Return our results and values and join them simply to our G_0[]
    return G_0.join("");
}
console.log('Push into G_0:');
generation(heap);