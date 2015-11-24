// ---------------------------------------------------------------------------
// 1.1 Root[0] Heap Representation
// ---------------------------------------------------------------------------

// Let's add some 'boxed' objects onto the heap.
// Object 'integer' is allocated at address 0
// This object is now 'reachable' from the 'root' index:
var integer = alloc_struct({a: 10});
console.log(integer);

// Object 'string' is allocated at address 1
// This object is now 'reachable' from the 'integer' object:
var string = alloc_struct({b: 'Dictionary'});
// The allocation uses the address (array index) 
// where "string" is allocated on the heap:
integer['string'] = string['address']; 
console.log(string);

// Object "bool_t" is allocated at address 2
// The object is now 'reachable' from "integer": 
// e.g = root -> integer -> bool_t
var bool_t = alloc_struct({c: true});
// The allocation uses the address (array index) where "bool_t"
// is allocated on the heap as follows:
integer['bool_t'] = bool_t['address']; 
console.log(bool_t);

// Now, let us delete the 'bool_t' reference from 'integer'
// Now 'bool_t' is 'unreachable' and subsequently becomes a candidate for GC.
delete integer['bool_t'];
console.log(integer);

// Object "string_" is allocated at address 3
// The object is 'reachable' from 'string' 
// (which in turn is reachable from:
// 'integer': root -> integer -> string -> string_
var string_ = alloc_struct({d: 'Hello'});
string['string_'] = string_['address']; 

// But then the 'string' object reference is removed from 'integer'.
delete integer['string'];
console.log(integer);

// Yet, let us not forget that 'string_' still has the reference to it
// from "string", but it's not reachable (since the "b" itself is not reachable anymore).
// e.g = root: -> integer --//--> string -> string_

// REMEMBER: that even when an object has some references to it, it doesn't
// mean it cannot be GC'ed. The criteria is "reachability", but not the
// reference counting here.

// Object 'bool_f' is allocated at address 4 
// This becomes 'reachable' from the object 'integer'
var bool_f = alloc_struct({e: false});
integer['bool_f'] = bool_f['address'];
// IMPORTANT: the object 'bool_f' also has back-reference to 'integer':
bool_f['integer'] = integer['address'];
console.log(integer);

// ---------------------------------------------------------------------------
// 1.2 Heap[1] Representation
// ---------------------------------------------------------------------------

// Results from the first GC_SC:

// a: 10
// bool_f: 
// forwardingAddress: 
// Keep a:
var bool_f = alloc_struct_({a: false});
console.log(integer);

// b: "Dictionary"
// string_:
// keep b: 
var string = alloc_struct_({b: 'Once Upon A Time'});
// The allocation uses the address (array index) 
// where "string" is allocated on the heap:
integer['bool_f'] = string['address']; 
console.log(string);

// c: true
// delete c:
delete integer['bool_t'];
console.log(integer);


// d: "Hello"
// delete d:
delete integer['string_'];
console.log(integer);


// e: false
// integer:
// a: 
// bool_f: 
// forwardingAddress: 11
// a: 11
// bool_f: 
var bool_f = alloc_struct_({c: false});
integer['bool_f'] = bool_f['address'];
// IMPORTANT: the object 'bool_f' also has back-reference to 'integer':
bool_f['integer'] = integer['address'];
console.log(integer);
// Should now have only three objects as two have been deleted.










