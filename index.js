console.warn('WARN - async-chainable is still under heavy development');

var async = require('async');

// Import all Async functionality so this module becomes a drop-in replacement {{{
// Collections
module.exports.each = async.each;
module.exports.eachSeries = async.eachSeries;
module.exports.eachLimit = async.eachLimit;
module.exports.map = async.map;
module.exports.mapSeries = async.mapSeries;
module.exports.mapLimit = async.mapLimit;
module.exports.filter = async.filter;
module.exports.filterSeries = async.filterSeries;
module.exports.reject = async.reject;
module.exports.rejectSeries = async.rejectSeries;
module.exports.reduce = async.reduce;
module.exports.reduceRight = async.reduceRight;
module.exports.detect = async.detect;
module.exports.detectSeries = async.detectSeries;
module.exports.sortBy = async.sortBy;
module.exports.some = async.some;
module.exports.every = async.every;
module.exports.concat = async.concat;
module.exports.concatSeries = async.concatSeries;

// Control Flow
// module.exports.series = async.series;
// module.exports.parallel = async.parallel;
module.exports.parallelLimit = async.parallelLimit;
module.exports.whilst = async.whilst;
module.exports.doWhilst = async.doWhilst;
module.exports.until = async.until;
module.exports.doUntil = async.doUntil;
module.exports.forever = async.forever;
module.exports.waterfall = async.waterfall;
module.exports.compose = async.compose;
module.exports.seq = async.seq;
module.exports.applyEach = async.applyEach;
module.exports.applyEachSeries = async.applyEachSeries;
module.exports.queue = async.queue;
module.exports.priorityQueue = async.priorityQueue;
module.exports.cargo = async.cargo;
module.exports.auto = async.auto;
module.exports.retry = async.retry;
module.exports.iterator = async.iterator;
module.exports.apply = async.apply;
module.exports.nextTick = async.nextTick;
module.exports.times = async.times;
module.exports.timesSeries = async.timesSeries;
module.exports.Utils = async.Utils;

// Utils
module.exports.memoize = async.memoize;
module.exports.unmemoize = async.unmemoize;
module.exports.log = async.log;
module.exports.dir = async.dir;
module.exports.noConflict = async.noConflict;
// }}}

var _struct = [];
var _structPointer = 0;
var context = {};

/**
* Examines an argument stack and returns all passed arguments as a CSV
* e.g.
*	function test () { getOverload(arguments) };
*	test('hello', 'world') // 'string,string'
*	test(function() {}, 1) // 'function,number'
*
* @param object args The special JavaScript 'arguments' object
* @return string CSV of all passed arguments
*/
var getOverload = function(args) {
	var i = 0;
	var out = [];
	while(1) {
		var argType = typeof args[i];
		if (argType == 'undefined') break;
		if (argType == 'object' && Object.prototype.toString.call(args[i]) == '[object Array]') // Special case for arrays being classed as objects
			argType = 'array';
		out.push(argType);
		i++;
	}
	return out.toString();
};

/**
* Queue up a function(s) to execute in series
* @param array,object,function The function(s) to execute
* @return object This chainable object
*/
module.exports.series = module.exports.then = function() {
	var calledAs = getOverload(arguments);
	switch(calledAs) {
		case 'function': // Form: series(func)
			_struct.push({ type: 'seriesArray', payload: [arguments[0]] });
			break;
		case  'string,function': // Form: series(String <id>, func)
			var payload = {};
			payload[arguments[0]] = arguments[1];
			_struct.push({ type: 'seriesObject', payload: payload});
			break;
		case 'array': // Form: series(Array <funcs>)
			_struct.push({ type: 'seriesArray', payload: arguments[0] });
			break;
		case 'object': // Form: series(Object <funcs>)
			_struct.push({ type: 'seriesObject', payload: arguments[0] });
			break;
		case 'string,string,function': // Form: series(String <prereq>, String <name>, func)
		case 'array,string,function': // Form: series(Array <prereq>, string <name>, func)
			var payload = {};
			payload[arguments[1]] = arguments[2];
			_struct.push({ type: 'seriesArray', prereq: [arguments[1]], payload: payload });
			break;

		// Async library compatibility {{{
		case 'array,function':
			_struct.push({ type: 'seriesArray', payload: arguments[0] });
			module.exports.end(arguments[1]);
			break;
		case 'object,function':
			_struct.push({ type: 'seriesObject', payload: arguments[0] });
			module.exports.end(arguments[1]);
			break;
		// }}}
		default:
			console.error('Unknown call style for .series():', calledAs);
	}

	return this;
};


/**
* Queue up a function(s) to execute in parallel
* @param array,object,function The function(s) to execute
* @return object This chainable object
*/
module.exports.parallel = function() {
	var calledAs = getOverload(arguments)
	switch (calledAs) {
		case 'function': // Form: parallel(func)
			_struct.push({ type: 'parallelArray', payload: [arguments[0]] });
			break;
		case 'string,function': // Form: parallel(String <id>, func)
			var payload = {};
			payload[arguments[0]] = arguments[1];
			_struct.push({ type: 'parallelArray', payload: payload });
			break;
		case 'array': // Form: parallel(Array <funcs>)
			_struct.push({ type: 'parallelArray', payload: arguments[0] });
			break;
		case 'object': // Form: series(Object <funcs>)
			_struct.push({ type: 'parallelObject', payload: arguments[0] });
			break;
		case 'string,string,function': // Form: parallel(String <prereq>, String <name>, func)
		case 'array,string,function': //Form: parallel(Array <prereqs>, String <name>, func)
			var payload = {};
			payload[arguments[1]] = arguments[2];
			_struct.push({ type: 'parallelArray', prereq: [arguments[0]], payload: payload });
			break;

		// Async library compatibility {{{
		case 'array,function':
			_struct.push({ type: 'parallelArray', payload: arguments[0] });
			module.exports.end(arguments[1]);
			break;
		case 'object,function':
			_struct.push({ type: 'parallelObject', payload: arguments[0] });
			module.exports.end(arguments[1]);
			break;
		// }}}
		default:
			console.error('Unknown call style for .parallel():', calledAs);
	}

	return this;
};


/**
* Queue up a function(s) to execute as defered - i.e. dont stop to wait for it
* @param array,object,function The function(s) to execute as a defer
* @return object This chainable object
*/
module.exports.defer = function() {
	var calledAs = getOverload(arguments);
	switch (calledAs) {
		case 'function': // Form: defer(func)
			_struct.push({ type: 'deferArray', payload: [arguments[0]] });
			break;
		case 'string,function': // Form: defer(String <id>, func)
			var payload = {};
			payload[arguments[0]] = arguments[1];
			_struct.push({ type: 'deferObject', payload: payload });
			break;
		case 'array': // Form: defer(Array <funcs>)
			_struct.push({ type: 'deferArray', payload: arguments[0] });
			break;
		case 'object': // Form: series(Object <funcs>)
			_struct.push({ type: 'deferObject', payload: arguments[0] });
			break;
		case 'string,string,function': // Form: defer(String <prereq>, String <name>, func)
		case 'array,string,function': //Form: defer(Array <prereqs>, String <name>, func)
			var payload = {};
			payload[arguments[1]] = arguments[2];
			_struct.push({ type: 'deferArray', prereq: [arguments[0]], payload: payload });
			break;
		default:
			console.error('Unknown call style for .defer():', calledAs);
	}

	return this;
};


/**
* Queue up an await point
* This stops the execution queue until its satisfied that dependencies have been resolved
* @param array,... The dependencies to check resolution of. If omitted all are checked
* @return object This chainable object
*/
module.exports.await = function() {
	var payload = [];

	// Slurp all args into payload {{{
	var args = arguments;
	getOverload(arguments).split(',').forEach(function(type, offset) {
		switch (type) {
			case '': // Blank arguments - do nothing
				// Pass
				break;
			case 'string':
				payload.push(args[offset]);
				break;
			case 'array':
				payload.concat(args[offset]);
				break;
			default:
				console.error('Unknown argument type passed to .await():', type);
		}
	});
	// }}}

	_struct.push({ type: 'await', payload: payload });

	return this;
};


/**
* Internal function executed at the end of the chain
* This can occur either in sequence (i.e. no errors) or a jump to this position (i.e. an error happened somewhere)
* @access private
*/
var finalize = function(err) {
	// Sanity checks {{{
	if (_struct[_struct.length-1].type != 'end') {
		console.error('While trying to find an end point in the async-chainable structure the last item in the _struct does not have type==end!');
		return;
	}
	// }}}
	_struct[_struct.length-1].payload.call(context, err);
};


/**
* Internal function to execute the next pending queue item
* This is usually called after the completion of every async.series() / async.parallel() call
* @access private
*/
var execute = function(err) {
	if (_structPointer >= _struct.length) return finalize(err); // Nothing more to execute in struct
	if (err) return finalize(err); // An error has been raised - stop exec and call finalize now
	var currentExec = _struct[_structPointer];
	// Sanity checks {{{
	if (!currentExec.type) {
		console.error('No type is specified for async-chainable structure at position', _structPointer, currentExec);
		return this;
	}
	// }}}
	_structPointer++;
	// Execute based on currentExec.type {{{
	switch (currentExec.type) {
		case 'parallelArray':
			async.parallel(currentExec.payload.map(function(task) {
				return function(next) {
					task.call(context, next);
				};
			}), function(err) {
				currentExec.completed = true;
				execute(err);
			});
			break;
		case 'parallelObject':
			var tasks = [];
			Object.keys(currentExec.payload).forEach(function(key) {
				tasks.push(function(next, err) {
					currentExec.payload[key].call(context, function(err, value) {
						context[key] = value; // Allocate returned value to context
						next(err);
					})
				});
			});
			async.parallel(tasks, function(err) {
				currentExec.completed = true;
				execute(err);
			});
			break;
		case 'seriesArray':
			async.series(currentExec.payload.map(function(task) {
				return function(next) {
					task.call(context, next);
				};
			}), function(err) {
				currentExec.completed = true;
				execute(err);
			});
			break;
		case 'seriesObject':
			var tasks = [];
			Object.keys(currentExec.payload).forEach(function(key) {
				tasks.push(function(next, err) {
					currentExec.payload[key].call(context, function(err, value) {
						context[key] = value; // Allocate returned value to context
						next(err);
					})
				});
			});
			async.series(tasks, function(err) {
				currentExec.completed = true;
				execute(err);
			});
			break;
		case 'deferArray':
			async.parallel(currentExec.payload.map(function(task) {
				return function(next) {
					task.call(context, next);
				};
			}), function(err) {
				currentExec.completed = true;
				if (_struct[_structPointer].type == 'await')
					execute(err);
			});
			execute(); // Move on immediately
			break;
		case 'deferObject':
			var tasks = [];
			Object.keys(currentExec.payload).forEach(function(key) {
				tasks.push(function(next, err) {
					currentExec.payload[key].call(context, function(err, value) {
						context[key] = value; // Allocate returned value to context
						next(err);
					})
				});
			});
			async.parallel(tasks, function(err) {
				currentExec.completed = true;
				if (_struct[_structPointer].type == 'await')
					execute(err);
			});
			execute(); // Move on immediately
			break;
		case 'await': // Await can operate in two modes, either payload=[] (examine all) else (examine specific keys)
			if (!currentExec.payload.length) { // Check all tasks are complete
				if (_struct.slice(0, _structPointer - 1).every(function(stage) { // Examine all items UP TO this one and check they are complete
					return stage.completed;
				})) { // All tasks up to this point are marked as completed
					currentExec.completed = true;
					execute(); // Go onto next stage
				} else {
					_structPointer--; // At least one task is outstanding - rewind to this stage so we repeat on next resolution
				}

			} else { // Check certain tasks are complete by key
				var allOk = true;
				if (currentExec.payload.every(function(dep) { // Examine all named dependencies
					return !! context[dep];
				})) { // All are present
					currentExec.completed = true;
					execute(); // Go onto next stage
				} else {
					_structPointer--; // At least one dependency is outstanding - rewind to this stage so we repeat on next resolution
				}
			}
			break;
		case 'end': // This should ALWAYS be the last item in the structure and indicates the final function call
			finalize();
			break;
		default:
			console.error('Unknown async-chainable exec type:', currentExec);
			return;
	}
	// }}}
};


/**
* Reset all state variables and return the object into a pristine condition
* @return object This chainable object
*/
module.exports.reset = function() {
	_struct = [];
	_structPointer = 0;
	context = {
		_struct: _struct,
		_structPointer: _structPointer
	};
};

/**
* Queue up an optional single function for execution on completion
* This function also starts the queue executing
* @return object This chainable object
*/
module.exports.end = function() { 
	var calledAs = getOverload(arguments);
	switch (calledAs) {
		case '': // No functions passed - do nothing
			_struct.push({ type: 'end', payload: function() { console.log('NOOP!')} });
			break;
		case 'function': // Form: end(func) -> redirect as if called with series(func)
			_struct.push({ type: 'end', payload: arguments[0] });
			break;
		default:
			console.error('Unknown call style for .end():', calledAs);
	}

	execute();
	return this;
};

// Setup initial context

/**
* The context used as `this` when calling all functions
* @type object
*/
module.exports.context = context;

module.exports.reset(); // Enter initial state
