/**
 * Generational Garbage Collection technique.
**/

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
// These can then be broken into two generations: 'FROM_SPACE' (old_generation), 
// 'TO_SPACE' (young_generation). The young generation: Most of the newly created objects 
// are located here. The from-space: Objects that did not become unreachable / survived 
// the to-space are copied here. When objects disappear from the to-space: 
// we say a 'minor GC' has occurred. When objects disappear from the old generation: we say a 
// 'major GC' (or a 'full GC') has occurred. There are a number of different algorithms that
// incrementally perform this proceedure. For example, the traditional "mark and sweep" algorithm, 
// however this lacksany generational proceedure. Rather the algorithm, uses traversing methods
// over unreachable and reachable objects in the heap. This is known as the 'marking phase',
// - subsequently, the 'sweep' phase occurs soon after. Sweeping takes all the unreachable objects 
// and assigns them too an empty space. Other various algorthims have derived from 'mark and sweep',
// such as the 'Stop and Copy' algorithm this program is dervived from.


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

// Now we can implment our heap divisions. The heap is divided into two spaces 
// for our objects to be assigned in. The from-space or 'old generation' is where our 
// <current objects> live. The to-space or 'young generation' in contrast is initially
// reserved for GC needs. First half (0-9 indices) is from-space, the second half 
// (indices 10-19) is the to-space.

// Set up two variables for the two generational divisions and their indices.
// Reasons for doing this are because: In many programs, recently created objects are also 
// most likely to become unreachable incredibly quicker than first thought. 
// This is known as the infant mortality or the generational hypothesis.
// With generational GC's it is easier to divide our heap into two divisions 
// for this purpose. Therefore, many generational GC's use separate memory regions
// for different ages of objects.

// Current from-space (working) space.
var FROM_SPACE = 0; 
// Start of the to-space space.
var TO_SPACE = 10; 
// Spaces for the generation objects to be passed after GC.
var G_0 = {};
var G_1 = {};
var G_2 = {};

console.log(FROM_SPACE);
console.log(TO_SPACE);

// Initially the allocation pointer is set to the beginning of 
// the from-space (to zero).
var POINTER = FROM_SPACE;

// Set up a function which denotes allocation of various objects. 
// Then assign our objects and store onto the heap.
// The 'POINTER' returns object(s) back.
// We also explicitly keep the address on the object 
// the heap array index, where the object is allocated.
// Incrementally this increases the 'POINTER'.
function pointAddress(object) {
  // Puts 'object' inside 'heap[POINTER]'
  heap[POINTER] = object;
  // Set up post-increment operator
  POINTER++;

  return object;
}


// ---------------------------------------------------------------------------
// 1.1 Root Heap[0] Representation
// ---------------------------------------------------------------------------

// Let's add some 'boxed' objects onto the heap.
// Object 'INT' is allocated at address 0
// This object is now 'reachable' from the 'root' index:
var INT = pointAddress({a: 10});
console.log(INT);

// Object 'STRING' is allocated at address 1
// This object is now 'reachable' from the 'INT' object:
var STRING = pointAddress({b: 'Rocket man'});
// The allocation uses the address (array index) 
// where "STRING" is allocated on the heap:
INT['STRING'] = STRING['address']; 
console.log(STRING);

// Object "BOOL" is allocated at address 2
// The object is now 'reachable' from "INT": 
// e.g = root -> INT -> BOOL
var BOOL = pointAddress({c: true});
// The allocation uses the address (array index) where "BOOL"
// is allocated on the heap as follows:
INT['BOOL'] = BOOL['address']; 
console.log(BOOL);

// Now, let us delete the 'BOOL' reference from 'INT'
// Now 'BOOL' is 'unreachable' and subsequently becomes a candidate for GC.
delete INT['BOOL'];
console.log(INT);

// Object "STRING_" is allocated at address 3
// The object is 'reachable' from 'string' 
// (which in turn is reachable from:
// 'INT': root -> INT -> STRING -> STRING_
var STRING_ = pointAddress({d: 'Hello'});
STRING['STRING_'] = STRING_['address']; 

// But then the 'STRING' object reference is removed from 'INT'.
delete INT['STRING'];
console.log(INT);

// Yet, let us not forget that 'string_' still has the reference to it
// from "STRING", but it's not reachable (since the "b" itself is not reachable anymore).
// e.g = root: -> INT --//--> STRING -> STRING_
// Also, remember that even when an object has some references to it, it doesn't
// mean it cannot be GC'ed. The criteria is "reachability", but not the
// reference counting here.

// Object 'BOOL_' is allocated at address 4 
// This becomes 'reachable' from the object 'INT'
var BOOL_ = pointAddress({e: false});
INT['BOOL_'] = BOOL_['address'];
// IMPORTANT: the object 'BOOL_' also has back-reference to 'INT':
BOOL_['INT'] = INT['address'];
console.log(INT);

// After various assignments and deletions, the passing of 'reachable' to 'unreachable', 
// the heap still contains five objects:
// INT = a, STRING = b, BOOL = c, STRING_ = d, BOOL_ = e, but remember, only 
// the objects: INT and BOOL_ are now 'reachable' on the heap starting from the root index.


// ---------------------------------------------------------------------------
// 2. Stop and Copy GC, Fixing Pointer Issue and Fowarding Pointers
// ---------------------------------------------------------------------------

// In this moving Stop and Copy GC, all memory is divided into a 'from-space' and 'to-space'. 
// Initially, objects are allocated into a 'to-space' until the space becomes full. 
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
// incrementally and we can denote markers accordingly by dividing the to-space 
// into three parts: 
//   Copied & Scanned objects *
//   Just copied objects *
//   And the Free space *

// Our new allocation pointers are set to the boundary of both the to-space and from-space
// or 'old generation' and 'young generation' (that is, to the middle of our heap array).

// Allocate from the to-space now at GC:
POINTER = TO_SPACE;
// And the Scanner pointer is set initially here too:
var SCANNER_POINTER = POINTER;

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
  object['forwardingAddress'] = POINTER;
  // Put on the heap (which increases the pointAddress pointer).
    pointAddress(newCopiedObject);

  return newCopiedObject;
}

// Now let's set up a function to check if value is an address:
// For abstraction the function and algorithm usees simplified versioning.
// We take the address in the heap array using its index (which are numbers). 
// E.g. Int_const.String_const_long = 1.
function checkAddress(name, value) {
  return typeof value == 'number' && name != 'address' && name != 'forwardingAddress';
}

// ---------------------------------------------------------------------------
// 3. Start the 'Stop & Copy' GC Phase
// ---------------------------------------------------------------------------

function gc_sc() {
  // Firstly, we must copy 'root' objects to the new space. 
  // We only have one reachable object here and that is the 'INT' object.
  // Therefore, we can do this by assigning our copyNewSpace(INT).
  // Let's copy it to the to-space, by automatically increasing the 
  // allocation pointer, but still keeping the scan pointer at its position.
  var copy = copyNewSpace(INT);
  INT['forwardingAddress'] = copy['address'];

  // From this, we have now differentiated our scanner and allocation pointers.
  // For now we have only the 'INT' object. During our scanning, we copy all 
  // these sub-objects and mark them as copied too (set the "forwarding address" flag).

  while (SCANNER_POINTER != POINTER) { 
      // Get the next object within our Scanner pointer:
      var nextObjectScan = heap[SCANNER_POINTER];
      // Begin a simple traversal algorithm, checking all its reference properties
      for (var p1 in nextObjectScan) if (checkAddress(p1, nextObjectScan[p1])) {
      
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
    // Now we can swap from-space and to-space, making the to-space our working
    // runtime memory, and the from-space reserved for GC.
    for (var k = FROM_SPACE; k < TO_SPACE; k++) {
      // Just clean old space for the debug purpose. In real practice it's not
      // necessary, this addresses can be just overridden by later allocations.
      delete heap[k];
  }

    // Store our five live objects
    var storeAll = TO_SPACE;
    // Reset = 0 objects
    TO_SPACE = FROM_SPACE;
    // Reset = 5 objects
    FROM_SPACE = storeAll;

} // End gc_sc();


// ---------------------------------------------------------------------------
// 4. Pretty Print Our Results So Far.
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
          empty_string.push(item, " -> ", objectToString(object[item]), "\n");
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
// Notice, that the address of 'BOOL_' in the 'INT' object is 4, and
// the back-reference address of 'INT' on 'BOOL_' is 0.
// Let's show some implementated results:
console.log('HEAP BEFORE GC_SC:' + '\n\n', objectToString(heap));


// Now let's run the GC algorithm:
console.log('PERFORM GC_SC ALGORITHM: gc_sc();');
gc_sc();

// Now let's show some implemented results with the GC algorithm:
// Notice, that the address of 'BOOL_' object in the 'INT' is correctly
// updated to the new location, 11, and the the back-reference
// address of 'INT' on 'BOOL_' is 10.
console.log('HEAP AFTER GC_SC:' + '\n\n', objectToString(heap));

// ---------------------------------------------------------------------------
// 5. Mechanism To Copy The Newly Assigned Live Data Into Generations
// ---------------------------------------------------------------------------

// We need a mechanism to copy the live data of one region of memory to a 
// contiguous group of records in another region.

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

// ALGORITHM:

// Take objects of simillar age. This would be the state of our heap
// after the GC_SC function has been called.
// Objects containing simillar age : [heap]
// Divide, objects, add to a generational space
// Perform GC_SC algorithm, with each result, add to a new space.

// 1 - Take all objects in [heap] (currently there will be)
// 2 - Divide and segment objects from [heap]
// 3 - Push all objects in [heap] into our first generation: G0.
// 3 - Push objects into older g1, g2 as they survive successive collection cycles.

// NOTE TO SELF: Am I right in thinking that I need too run the gc_sc function 
// within each G_0, G_1, G_2 etc.

function generation(object, array) {
  // Pull elements from heap and push into our array.
  if (typeof(object) == "object") {
      for (item in object) {
         // Segment our heap items.
          for (var i = 0; i < item.length;)
              // Then for each item push into array
              i++;
            array[item] = object[item];
          }
      };
    // Return our farray
    return array;
}

// ---------------------------------------------------------------------------
// 6. Generation Tests and Re-assignments
// ---------------------------------------------------------------------------
// Show results of our new array objects:
// Callback our generation function upon the manipulated heap,
// takes the parameters of both the object(heap), and desired generational
// array space (G_0,G_1, G_2);
// As it seems, the gc_sc() function is just running ontop of the manipulated heap.
// There seems to be 1 index being added, 11 is being added to another index, each
// time the gc_sc() is being called...?
// Best bet is taking the manipulated heap and using some reassignment logic as we
// did at the top of the program. As this is an abstracted representation of a GGC,
// making JavaScript do all our systematic work is quite tricky. 

// Begin another re-assignment of variables and addresses on the current heap.
// Perform another gc_sc() upon new assignments and see what the results are.
// Hopefully, less objects than previous. 
// If so, store the objects into G_0.

console.log('PUSH HEAP INTO G_0;');
generation(heap, G_0);
console.log('G_0 RESULTS:' + '\n\n' + objectToString(G_0));


// ---------------------------------------------------------------------------
// 1.2 Heap[1] Representation
// ---------------------------------------------------------------------------

// If we take the results from the first GC_SC, then we can continue our abstract
// representation of the heap into our generational phases. The following 

// Repeat steps until you fill up G_1, G_2.
console.log('REARRANGE HEAP:');

// Object 'STRING' is now allocated at address 1
// This object is now 'reachable' from the 'root' index:
var STRING_1 = pointAddress({f: 'Once Upon A Time'});
// The allocation uses the address (array index) 
// where "STRING" is allocated on the heap:
INT['STRING_1'] = STRING_1['address']; 
console.log(STRING_1);

// But then both STRING & BOOL_ object references are removed from 'INT'.
delete INT['STRING'];
delete INT['BOOL_'];

// Object "STRING_" is allocated at address 2
// The object is now 'reachable' from "INT": 
// e.g = root -> INT -> STRING_
var STRING_2 = pointAddress({g: 'In The West'});
// The allocation uses the address (array index) where 'STRING_'
// is allocated on the heap as follows:
INT['STRING_2'] = STRING_2['address']; 
console.log(STRING_2);

// Now, let us delete the 'STRING_' reference from 'INT'
// Now 'STRING_' is 'unreachable' and subsequently becomes a candidate for GC.
delete INT['STRING_2'];

// Show results of our heap before our GC_SC() callback.
console.log('HEAP BEFORE GC_SC:' + '\n\n', objectToString(heap));

// Should now have only three objects as two have been deleted.
console.log('PERFORM GC_SC ALGORITHM: gc_sc();');

gc_sc();

// Show results of our heap after our GC_SC() callback.
console.log('HEAP AFTER GC_SC:' + '\n\n', objectToString(heap));

// Now after performing the GC_SC() upon our heap representation,
// we can now push our results into the G_1 array.
console.log('PUSH HEAP INTO G_1;');
generation(heap, G_1);
console.log('G_1 RESULTS:' + '\n\n' + objectToString(G_1));

// ---------------------------------------------------------------------------
// 1.2 Heap[2] Representation
// ---------------------------------------------------------------------------

// Let's add some 'boxed' objects onto the heap.
// Object 'STRING' is allocated at address 0
// This object is now 'reachable' from the 'root' index:
var STRING_3 = pointAddress({h: 'One last time'});
console.log(STRING_3);

// The allocation uses the address (array index) 
// where "INT" is allocated on the heap:
INT['STRING_3'] = INT['address']; 
console.log(INT);

// Object "STRING_" is allocated at address 3
// The object is 'reachable' from 'STRING' 
// (which in turn is reachable from:
// 'INT': root -> STRING -> INT -> STRING__
var STRING_4 = pointAddress({k: 'Hello there my friends'});
INT['STRING_4'] = INT['address']; 

// Now, let us delete the 'STRING' reference from 'INT'
// Now 'STRING' is 'unreachable' and subsequently becomes a candidate for GC.
delete INT['STRING_4'];

// Show results of our heap before our GC_SC() callback.
console.log('HEAP BEFORE GC_SC:' + '\n\n', objectToString(heap));

// Should now have only three objects as two have been deleted.
console.log('PERFORM GC_SC ALGORITHM: gc_sc();');

gc_sc();

// Show results of our heap after our GC_SC() callback.
console.log('HEAP AFTER GC_SC:' + '\n\n', objectToString(heap));

// Now after performing the GC_SC() upon our heap representation,
// we can now push our results into the G_1 array.
console.log('PUSH HEAP INTO G_2;');
generation(heap, G_2);
console.log('G_2 RESULTS:' + '\n\n' + objectToString(G_2));


// GIT VERSION HAS BEFORE AMENDS OF STRING_ VALUES ETC..