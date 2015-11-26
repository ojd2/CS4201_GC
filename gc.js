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

var heap = makeHeap(20); // heap of size 20

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

//console.log(FROM_SPACE);
//console.log(TO_SPACE);

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
// 1.1 Uniform Heap Representation
// ---------------------------------------------------------------------------

// Set up function for creating 'int' with a value of 'n'.
function makeInt (n, heap) {
    // The function returns our impleneted heap stack with the 
    // value associated with 'n'.
    return heap.pointAddress ({ intValue: n }); 
}
// Set up function for creating 'cons' with a value of 'head, tail and heap'.
function makeCons (head, tail, heap) {
   // The returned value proceeds with a function call implementing
   // our head, tail elements.
   return heap.pointAddress ({ head: head, tail: tail });
}
// Set up function to create our uniformed heap.
// Returns several values which store size, from space, next space, next_to space,
// and the to_space.

function alloc (object, object_array, size, next) {
      // if our next space is smaller and equal to size of heap
      if (next <= size) {
        // perform allocation of array to object.
        object_array[next] = object;
        // next needs to be decremented to resolve our array not pointing
        // to our desired root object.        
        return next;
      } else {
        // return failure code like null.
        console.log(next);
        console.log(size);
        console.log('Failure');
        return null;
      }
} // end pointAddress


function makeHeap (n) {
  return {
    size: n,
    from: new Array(n), // Array for from-space
    next: 0,
    next_to: 0,
    to: new Array(n), // Array for to-space

    pointAddress:  function (o) {
      return alloc(o, this.from, this.size, this.next++);
    },
    
    pointAddressTo: function (o) {
      return alloc(o, this.to, this.size, this.next_to++);
    },
    
    heapSwapSpaces: function () {
      var t = this.from;
      from = this.to;
      to = t;
    }
  } // end return

} // end makeHeap()


// Set up structure of the heap.
// Simple abstracted representation.

// We first use the makeInt() to create ourselves an integer object.
// Integer created stores the value 24 and associates itself with the
// new abstracted heap.
var z = makeInt(24, heap);
// Next, we do the same with our makeCons() function however we 
// add the value of a standard 'null'. Notice how we also tag 'z' which
// is a variable we are storing our integer in. 
// 24 -> null
// null -> 24
var x = makeCons(z, null, heap);

var f = makeCons(makeInt(42, heap), x, heap);

var y = makeCons(makeInt(55, heap), f, heap);



// The criteria for our GC is too target non-reachable objects.
// Therefore we must delete or cut off some root level association path for one
// of our objects for the GC to efficiently work. 

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
// Object is empty...
function copyNewSpace(heap, object) {
  // Now copy empty {}
  var newCopiedObject = {};

  // find items in our heap associated objects we have created.
  for (var item in heap.from[object]) {
    if (item != 'address' && item != 'forwardingAddress') {
          newCopiedObject[item] = heap.from[object][item];
    }
  }

  // Now mark the old object as copied:
  heap.from['forwardingAddress'] = POINTER;
  // Put on the heap (which increases the pointAddress pointer).
  // Takes copied object, from heap.to and increments over into next.to.
  return heap.pointAddressTo(newCopiedObject);
}

// Now let's set up a function to check if value is an address:
// For abstraction the function and algorithm usees simplified versioning.
// We take the address in the heap array using its index (which are numbers). 
// E.g. Int_const.String_const_long = 1.
function checkAddress(name, value) {
  return typeof value == 'number' && name != 'address' && name != 'forwardingAddress';
}

function copy(x, h) {

    // check for special case null object.
    if ( x == null) {
        return null;
    }

    console.log('address: ' + x);
    var new_x = copyNewSpace(h, x);

    for (f in heap.to[new_x]) {
        console.log('new address in to space: ' + new_x);
        if (f !== 'intValue') {
            copy(heap.to[new_x][f], h);
        }
    } 
    return new_x;
}



// ---------------------------------------------------------------------------
// 3. Start the 'Stop & Copy' GC Phase
// ---------------------------------------------------------------------------

function gc_sc(root, heap) {
  // Firstly, we must copy 'root' objects to the new space. 
  // We only have one reachable object here and that is the 'INT' object.
  // Therefore, we can do this by assigning our copyNewSpace(INT).
  // Let's copy it to the to-space, by automatically increasing the 
  // allocation pointer, but still keeping the scan pointer at its position.
  // var copy_ = copyNewSpace(heap, root);
  // root['forwardingAddress'] = copy_['address'];

  // From this, we have now differentiated our scanner and allocation pointers.
  // For now we have only the 'INT' object. During our scanning, we copy all 
  // these sub-objects and mark them as copied too (set the "forwarding address" flag).

  var SCANNER = heap.from;
  console.log('root: ' + root);

  //copy(root, heap);
  var new_roots = new Array ();

  for (var i = 0; i < root.length; i++) {
      new_roots.push(copy(root[i], heap));
  }


  // while (SCANNER < heap.size) {

  //           // Get the object to which this reference points to:
  //           var objectAtAddress = heap[address];

  //           // If that object hasn't been copied yet (i.e. has no forwarding address set)
  //           if (!('forwardingAddress' in objectAtAddress)) {
  //           // Then we copy this sub-object as well and mark it specifying 'forwardingAddress'.
  //           var copiedObjectAtAddress = copyNewSpace(objectAtAddress);
  //           // And we also need the pointer value on the scanning object to
  //           // refer to the new location.
  //           nextObjectScan[p1] = copiedObjectAtAddress.address;
  //         } 
  //         // Else, the object which this sub-property refers to, was already copied at
  //         // some previous scan of some other objects (an object can be referred by many
  //         // properties in different objects)
  //         else {
  //           // Then we just update the pointer to the forwarding address
  //           nextObjectScan[p1] = objectAtAddress.forwardingAddress;
  //         }
  // }

    // Now let us store and reset spaces.
    heap.heapSwapSpaces();

    return new_roots;

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

// Show some results
console.log('HEAP BEFORE GC:');

for (var k = 0; k < heap.size; k++) {
    console.log(JSON.stringify(heap.from[k]));
}
console.log('PERFORM GC_SC ALGORITHM: gc_sc(x, heap);');
console.log('RESULTS:');
gc_sc([f], heap);



//console.log(gc_sc(x, heap));



// Now let's show some implemented results with the GC algorithm:
// Notice, that the address of 'BOOL_' object in the 'INT' is correctly
// updated to the new location, 11, and the the back-reference
// address of 'INT' on 'BOOL_' is 10.

// console.log('HEAP AFTER GC_SC:' + '\n\n', objectToString(heap));

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

// function genHeaps() {
//   var heaps = {};
//   return object[];
// }

//  function createNextHeap(n)  {
//     this.heaps.push(makeHeap(n));
// }

// function generation(object, array) {
//   // Pull elements from heap and push into our array.
//   if (typeof(object) == "object") {
//       for (item in object) {
//          // Segment our heap items.
//           for (var i = 0; i < item.length;)
//               // Then for each item push into array
//               i++;
//               array[item] = object[item];

//             // Rather than iterate over object 'o'
//             // Say, for each object 'reachable o' in G_0 
//             // copy(o) into G_1

//             // G_1.alloc()

//             // if (o in pset) {
//             // continue
//             // }
            
//             // for (m in o) {
//             // o'[m] = o[m];
//             // }
//           }
//       };
//     // Return our array
//     return array;
// }


// generation(h, heaps, index);


// ---------------------------------------------------------------------------
// 6. Generation Tests and Promotion
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

//console.log('PUSH HEAP INTO G_0;');
//generation(heap, G_0);
//console.log('G_0 RESULTS:' + '\n\n' + objectToString(G_0));
