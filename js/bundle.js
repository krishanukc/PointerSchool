(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":3}],3:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
var ansic = require('./parser/ansic.js');

window.onload = function init(){
    
    function passAndHint(cm) {
        setTimeout(function() {cm.execCommand("autocomplete");}, 100);
      	return CodeMirror.Pass;
    }
      
    function myHint(cm) {
     	return CodeMirror.showHint(cm, CodeMirror.ternHint, {async: true}); 
    }
     
    CodeMirror.commands.autocomplete = function(cm) {
        CodeMirror.showHint(cm, myHint);
    }
    
    CodeMirror.commands.evaluate = function(cm) {
        evaluateText(console, editor.getValue());  
    }
    
    var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
        lineNumbers: true,
        styleActiveLine: true,
        theme: 'eclipse',
        mode: 'text/x-csrc',
        matchBrackets: true,
        extraKeys: {
            "Ctrl-Space": "autocomplete",
            "Ctrl-Enter": "evaluate"
        }
    });
    
    var console = CodeMirror.fromTextArea(document.getElementById("console"), {
        readOnly: true,
        theme: '3024-night',
        mode: 'none'
    });
    
    
}

function evaluateText(consoleWindow, text) {

    
    var ast;
    var a = 3;
    try{
        ast = ansic.parse(text);
        consoleWindow.setValue(ast);
        console.log(ast);
    } catch (exception) {
        consoleWindow.setValue("Parse Error: " + exception.message);
    }
    
}

},{"./parser/ansic.js":5}],5:[function(require,module,exports){
(function (process){
/* parser generated by jison 0.4.17 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var ansic = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,19],$V1=[1,20],$V2=[1,18],$V3=[1,12],$V4=[1,13],$V5=[1,14],$V6=[1,15],$V7=[1,16],$V8=[1,22],$V9=[1,23],$Va=[5,7,10,30,84,85,86,87,88,94,95],$Vb=[1,27],$Vc=[1,33],$Vd=[7,10,12,14,22,30,77],$Ve=[12,22,61,63,77,84,85,86,87,88,91,94,95],$Vf=[1,39],$Vg=[1,38],$Vh=[7,10,12,14,22,30,61,77,84,85,86,87,88,94,95],$Vi=[7,10,12,14,22],$Vj=[10,12,14,22,61,63,77,84,85,86,87,88,91,94,95],$Vk=[7,91],$Vl=[22,77],$Vm=[2,84],$Vn=[1,46],$Vo=[5,7,8,9,10,19,24,27,29,30,31,32,33,34,77,84,85,86,87,88,91,93,94,95,121,122,125,127,128,129,130,131,132,133],$Vp=[7,8,9,10,19,24,27,29,30,31,32,33,34,77,84,85,86,87,88,91,93,94,95,121,122,125,127,128,129,130,131,132,133],$Vq=[1,61],$Vr=[1,92],$Vs=[1,93],$Vt=[1,94],$Vu=[1,79],$Vv=[1,80],$Vw=[1,82],$Vx=[1,85],$Vy=[1,86],$Vz=[1,87],$VA=[1,88],$VB=[1,89],$VC=[1,90],$VD=[1,64],$VE=[1,62],$VF=[1,63],$VG=[1,66],$VH=[1,67],$VI=[1,68],$VJ=[1,69],$VK=[1,70],$VL=[1,71],$VM=[1,72],$VN=[1,73],$VO=[1,108],$VP=[1,125],$VQ=[5,7,8,9,10,19,24,27,29,30,31,32,33,34,77,84,85,86,87,88,91,93,94,95,121,122,125,126,127,128,129,130,131,132,133],$VR=[7,8,9,10,19,24,27,29,30,31,32,33,34,77,91,93,121,122,125,127,128,129,130,131,132,133],$VS=[7,8,9,10,19,24,27,29,30,31,32,33,34,77,91,93,121,122,125,126,127,128,129,130,131,132,133],$VT=[2,2],$VU=[7,8,9,10,12,19,24,27,29,30,31,32,33,34,77,91,93,121,122,125,126,127,128,129,130,131,132,133],$VV=[1,135],$VW=[12,15,22,61,77],$VX=[12,15,22,61,77,93],$VY=[12,15,22,29,30,31,32,36,37,40,41,43,44,45,46,48,49,52,54,56,58,60,61,77,93],$VZ=[2,28],$V_=[12,15,22,29,30,31,32,36,37,40,41,43,44,45,46,48,49,52,54,56,58,60,61,63,64,65,66,67,68,69,70,71,72,73,77,93],$V$=[1,166],$V01=[12,15,22,58,60,61,77,93],$V11=[1,171],$V21=[10,12,14,15,17,18,19,20,22,29,30,31,32,36,37,40,41,43,44,45,46,48,49,52,54,56,58,60,61,63,64,65,66,67,68,69,70,71,72,73,77,93],$V31=[7,8,9,10,19,24,27,29,30,31,32,33,34],$V41=[12,15,22,56,58,60,61,77,93],$V51=[1,172],$V61=[12,15,22,54,56,58,60,61,77,93],$V71=[1,176],$V81=[12,15,22,52,54,56,58,60,61,77,93],$V91=[1,177],$Va1=[12,15,22,29,52,54,56,58,60,61,77,93],$Vb1=[1,178],$Vc1=[1,179],$Vd1=[12,15,22,29,48,49,52,54,56,58,60,61,77,93],$Ve1=[1,180],$Vf1=[1,181],$Vg1=[1,182],$Vh1=[1,183],$Vi1=[12,15,22,29,43,44,45,46,48,49,52,54,56,58,60,61,77,93],$Vj1=[1,184],$Vk1=[1,185],$Vl1=[12,15,22,29,40,41,43,44,45,46,48,49,52,54,56,58,60,61,77,93],$Vm1=[1,186],$Vn1=[1,187],$Vo1=[12,15,22,29,31,32,40,41,43,44,45,46,48,49,52,54,56,58,60,61,77,93],$Vp1=[1,188],$Vq1=[1,189],$Vr1=[1,190],$Vs1=[12,22],$Vt1=[1,200],$Vu1=[1,201],$Vv1=[85,86,87,88,93,94,95],$Vw1=[1,208],$Vx1=[7,10,12,14,30,61],$Vy1=[22,77,93],$Vz1=[1,239],$VA1=[2,136],$VB1=[1,260],$VC1=[1,259],$VD1=[1,262],$VE1=[22,93],$VF1=[10,12,14,22];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"start":3,"translation_unit":4,"EOF":5,"primary_expression":6,"IDENTIFIER":7,"CONSTANT":8,"STRING_LITERAL":9,"(":10,"expression":11,")":12,"postfix_expression":13,"[":14,"]":15,"argument_expression_list":16,".":17,"PTR_OP":18,"INC_OP":19,"DEC_OP-":20,"assignment_expression":21,",":22,"unary_expression":23,"DEC_OP":24,"unary_operator":25,"cast_expression":26,"SIZEOF":27,"type_name":28,"&":29,"*":30,"+":31,"-":32,"~":33,"!":34,"multiplicative_expression":35,"/":36,"%":37,"additive_expression":38,"shift_expression":39,"LEFT_OP":40,"RIGHT_OP":41,"relational_expression":42,"<":43,">":44,"LE_OP":45,"GE_OP":46,"equality_expression":47,"EQ_OP":48,"NE_OP":49,"and_expression":50,"exclusive_or_expression":51,"^":52,"inclusive_or_expression":53,"|":54,"logical_and_expression":55,"AND_OP":56,"logical_or_expression":57,"OR_OP":58,"conditional_expression":59,"?":60,":":61,"assignment_operator":62,"=":63,"MUL_ASSIGN":64,"DIV_ASSIGN":65,"MOD_ASSIGN":66,"ADD_ASSIGN":67,"SUB_ASSIGN":68,"LEFT_ASSIGN":69,"RIGHT_ASSIGN":70,"AND_ASSIGN":71,"XOR_ASSIGN":72,"OR_ASSIGN":73,"constant_expression":74,"declaration":75,"declaration_specifiers":76,";":77,"init_declarator_list":78,"storage_class_specifier":79,"type_specifier":80,"init_declarator":81,"declarator":82,"initializer":83,"TYPEDEF":84,"TYPE_NAME":85,"CHAR":86,"INT":87,"DOUBLE":88,"struct_or_union_specifier":89,"struct_or_union":90,"{":91,"struct_declaration_list":92,"}":93,"STRUCT":94,"UNION":95,"struct_declaration":96,"specifier_qualifier_list":97,"struct_declarator_list":98,"struct_declarator":99,"enum_specifier":100,"ENUM":101,"enumerator_list":102,"enumerator":103,"pointer":104,"direct_declarator":105,"parameter_type_list":106,"identifier_list":107,"parameter_list":108,"ELLIPSIS":109,"parameter_declaration":110,"abstract_declarator":111,"direct_abstract_declarator":112,"initializer_list":113,"statement":114,"labeled_statement":115,"compound_statement":116,"expression_statement":117,"selection_statement":118,"iteration_statement":119,"jump_statement":120,"CASE":121,"DEFAULT":122,"statement_list":123,"declaration_list":124,"IF":125,"ELSE":126,"SWITCH":127,"WHILE":128,"DO":129,"FOR":130,"CONTINUE":131,"BREAK":132,"RETURN":133,"external_declaration":134,"function_definition":135,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",7:"IDENTIFIER",8:"CONSTANT",9:"STRING_LITERAL",10:"(",12:")",14:"[",15:"]",17:".",18:"PTR_OP",19:"INC_OP",20:"DEC_OP-",22:",",24:"DEC_OP",27:"SIZEOF",29:"&",30:"*",31:"+",32:"-",33:"~",34:"!",36:"/",37:"%",40:"LEFT_OP",41:"RIGHT_OP",43:"<",44:">",45:"LE_OP",46:"GE_OP",48:"EQ_OP",49:"NE_OP",52:"^",54:"|",56:"AND_OP",58:"OR_OP",60:"?",61:":",63:"=",64:"MUL_ASSIGN",65:"DIV_ASSIGN",66:"MOD_ASSIGN",67:"ADD_ASSIGN",68:"SUB_ASSIGN",69:"LEFT_ASSIGN",70:"RIGHT_ASSIGN",71:"AND_ASSIGN",72:"XOR_ASSIGN",73:"OR_ASSIGN",77:";",84:"TYPEDEF",85:"TYPE_NAME",86:"CHAR",87:"INT",88:"DOUBLE",91:"{",93:"}",94:"STRUCT",95:"UNION",101:"ENUM",109:"ELLIPSIS",121:"CASE",122:"DEFAULT",125:"IF",126:"ELSE",127:"SWITCH",128:"WHILE",129:"DO",130:"FOR",131:"CONTINUE",132:"BREAK",133:"RETURN"},
productions_: [0,[3,2],[6,1],[6,1],[6,1],[6,3],[13,1],[13,4],[13,3],[13,4],[13,3],[13,3],[13,2],[13,2],[16,1],[16,3],[23,1],[23,2],[23,2],[23,2],[23,2],[23,4],[25,1],[25,1],[25,1],[25,1],[25,1],[25,1],[26,1],[26,4],[35,1],[35,3],[35,3],[35,3],[38,1],[38,3],[38,3],[39,1],[39,3],[39,3],[42,1],[42,3],[42,3],[42,3],[42,3],[47,1],[47,3],[47,3],[50,1],[50,3],[51,1],[51,3],[53,1],[53,3],[55,1],[55,3],[57,1],[57,3],[59,1],[59,5],[21,1],[21,3],[62,1],[62,1],[62,1],[62,1],[62,1],[62,1],[62,1],[62,1],[62,1],[62,1],[62,1],[11,1],[11,3],[74,1],[75,2],[75,3],[76,1],[76,2],[76,1],[76,2],[78,1],[78,3],[81,1],[81,3],[79,1],[80,1],[80,1],[80,1],[80,1],[80,1],[89,5],[89,4],[89,2],[90,1],[90,1],[92,1],[92,2],[96,3],[97,2],[97,1],[98,1],[98,3],[99,1],[99,2],[99,3],[100,4],[100,5],[100,2],[102,1],[102,3],[103,1],[103,3],[82,2],[82,1],[105,1],[105,3],[105,4],[105,3],[105,4],[105,4],[105,3],[104,1],[104,2],[106,1],[106,3],[108,1],[108,3],[110,2],[110,2],[110,1],[107,1],[107,3],[28,1],[28,2],[111,1],[111,1],[111,2],[112,3],[112,2],[112,3],[112,3],[112,4],[112,2],[112,3],[112,3],[112,4],[83,1],[83,3],[83,4],[113,1],[113,3],[114,1],[114,1],[114,1],[114,1],[114,1],[114,1],[115,3],[115,4],[115,3],[116,2],[116,3],[116,3],[116,4],[124,1],[124,2],[123,1],[123,2],[117,1],[117,2],[118,5],[118,7],[118,5],[119,5],[119,7],[119,6],[119,7],[120,2],[120,2],[120,2],[120,3],[4,1],[4,2],[134,1],[134,1],[135,4],[135,3],[135,3],[135,2]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
 /*typeof console !== 'undefined' ? console.log($$[$0-1]) : print($$[$0-1]);*/
        parserUtils.printSymbolTable();
        parserUtils.clearSymbolTable();
        return this.$; 
    
break;
case 2: case 4: case 10: case 37: case 40: case 45: case 50: case 54: case 56: case 58: case 60: case 73: case 75: case 78: case 80: case 82: case 84: case 87: case 88: case 89: case 91: case 95: case 96: case 97: case 101: case 102: case 104: case 105: case 115: case 116: case 136: case 137: case 148: case 151: case 153: case 154: case 155: case 156: case 157: case 158: case 168: case 170: case 183: case 185: case 186:
this.$ = [$$[$0]];
break;
case 3:

        number = Number($$[$0]);
        // Return pair of value with its type
        // Only int and double are supported
        // TODO Support more types
        if(number % 1 === 0){
            this.$ = parserUtils.generateTuple(number, parserUtils.typeEnum.INT);
        } else {
            this.$ = parserUtils.generateTuple(number, parserUtils.typeEnum.DOUBLE);
        } 
    
break;
case 5: case 149: case 163: case 164: case 179: case 180: case 181:
this.$ = [$$[$0-1]];
break;
case 6: case 14: case 16: case 22: case 23: case 24: case 25: case 26: case 27: case 28: case 30:
this.$ = $$[$0];
break;
case 7: case 9: case 93:
this.$ = [$$[$0-3], $$[$0-1]];
break;
case 8: case 150:
this.$ = [$$[$0-2]];
break;
case 11: case 188: case 189:
this.$ = [$$[$0-2], $$[$0-1], $$[$0]];
break;
case 12: case 79: case 81: case 94: case 98: case 100: case 114: case 138: case 169: case 184: case 190:
this.$ = [$$[$0-1], $$[$0]];
break;
case 15: case 74: case 165: case 182:
this.$ = [$$[$0-2], $$[$0-1]];
break;
case 31:

        // Type mismatch
        if($$[$0-2].type !== parserUtils.typeEnum.INT
            && $$[$0-2].type !== parserUtils.typeEnum.DOUBLE)
            throw new TypeError("Arguments of multiplication must be numbers.");
        
        if($$[$0].type !== parserUtils.typeEnum.INT
            && $$[$0].type !== parserUtils.typeEnum.DOUBLE)
            throw new TypeError("Arguments of multiplication must be numbers.");
        
        mul = $$[$0-2].value;
        cast = $$[$0].value;
        
        if(isNaN(mul) || isNaN(cast)){
            throw new TypeError("Arguments of multiplication must be numbers.");
        }
        
        var newType;
        if($$[$0-2].type === parserUtils.typeEnum.INT && $$[$0] === parserUtils.typeEnum.INT)
            newType = parserUtils.typeEnum.INT;
        else
            newType = parserUtils.typeEnum.DOUBLE;
        this.$ = parserUtils.generateTuple(mul * cast, newType); // TODO envolve in tuple
    
break;
case 32:

        if($$[$0-2].type !== parserUtils.typeEnum.INT
            && $$[$0-2].type !== parserUtils.typeEnum.DOUBLE)
            throw new TypeError("Arguments of division must be numbers.");
        
        if($$[$0].type !== parserUtils.typeEnum.INT
            && $$[$0].type !== parserUtils.typeEnum.DOUBLE)
            throw new TypeError("Arguments of division must be numbers.");
        
        mul = $$[$0-2].value;
        cast = $$[$0].value;
        
        if(isNaN(mul) || isNaN(cast)){
            throw new TypeError("Arguments of division must be a valid numbers.");
        }
        
        // If both are integers
        if($$[$0-2].type === parserUtils.typeEnum.INT && $$[$0].type === parserUtils.typeEnum.INT){
            this.$ = parserUtils.generateTuple(~~(mul / cast),parserUtils.typeEnum.INT); //TODO check division by 0
        } else {
            this.$ = parserUtils.generateTuple(mul / cast, parserUtils.typeEnum.DOUBLE);
        }
    
break;
case 33:

        if($$[$0-2].type !== parserUtils.typeEnum.INT)
            throw new TypeError("Arguments of remainder must be integer numbers.");
        
        if($$[$0].type !== parserUtils.typeEnum.INT)
            throw new TypeError("Arguments of remainder must be integer numbers.");
        
        var mul = $$[$0-2].value;
        var cast = $$[$0].value;
        var remainder = mul % cast
        
        if(isNaN(mul) || isNaN(cast) || isNaN(remainder)){
            throw new TypeError("Value of remainder is invalid.");
        }
        
        this.$ = parserUtils.generateTuple(remainder, parserUtils.typeEnum.INT);
    
break;
case 34:
this.$ = $$[$0].value;
break;
case 35:

        add = Number($$[$0-2]);
        mul = Number($$[$0]);
        
        if(isNaN(add) || isNaN(mul)){
            throw new TypeError("Arguments of addition must be numbers.");
        }
        
        this.$ = add + mul;
    
break;
case 36:

        add = Number($$[$0-2]);
        mul = Number($$[$0]);
        
        if(isNaN(add) || isNaN(mul)){
            throw new TypeError("Arguments of addition must be numbers.");
        }
        
        this.$ = add - mul;
    
break;
case 48: case 52: case 90:
this.$ = [$$[$0]] ;
break;
case 61:

        // Check if unary_expression is defined in variable table
        // Check type of unary_expression in variable table and compare with type of assignment_expression
        // Apply assignment operator
        console.log("unary_expression: " + $$[$0-2] + ", assignment_operator: " + $$[$0-1] + ", assignment_expression: " + $$[$0]);
        this.$ = $$[$0-2];
    
break;
case 76:
this.$ = [$$[$0-1]] // Ignore;
break;
case 77:
this.$ = [$$[$0-2], $$[$0-1]] // ;
break;
case 83: case 103: case 106: case 152: case 159: case 161:
this.$ = [$$[$0-2], $$[$0]];
break;
case 85:

        // Check if symbol has already been declared
        parserUtils.addInitialSymbolTable($$[$0-2], $$[$0]);
        console.log("Initial add to symbol table. Declarator: " + $$[$0-2] + ", Initializer: " + $$[$0].value);
    
break;
case 92:
this.$ = ["type:struct_or_union_specifier", $$[$0-4], $$[$0-3], $$[$0-2], $$[$0-1], $$[$0]];
break;
case 99:
this.$ =[$$[$0-2], $$[$0-1], $$[$0]];
break;
case 160:
this.$ = [$$[$0-3], $$[$0-2], $$[$0]];
break;
case 166:
this.$ =[$$[$0]];
break;
case 167:
this.$ =[$$[$0-1], $$[$0]];
break;
case 171:
this.$ = [$$[$0-1], ";"] ;
break;
case 187:
this.$ = [$$[$0-3], $$[$0-2], $$[$0-1], $$[$0]];
break;
}
},
table: [{3:1,4:2,7:$V0,10:$V1,30:$V2,75:5,76:6,79:8,80:9,82:7,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,94:$V8,95:$V9,104:10,105:11,134:3,135:4},{1:[3]},{5:[1,24],7:$V0,10:$V1,30:$V2,75:5,76:6,79:8,80:9,82:7,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,94:$V8,95:$V9,104:10,105:11,134:25,135:4},o($Va,[2,183]),o($Va,[2,185]),o($Va,[2,186]),{7:$V0,10:$V1,30:$V2,77:$Vb,78:28,81:29,82:26,104:10,105:11},{75:32,76:34,79:8,80:9,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,91:$Vc,94:$V8,95:$V9,116:31,124:30},o($Vd,[2,78],{79:8,80:9,89:17,90:21,76:35,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,94:$V8,95:$V9}),o($Vd,[2,80],{79:8,80:9,89:17,90:21,76:36,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,94:$V8,95:$V9}),{7:$V0,10:$V1,105:37},o($Ve,[2,115],{10:$Vf,14:$Vg}),o([7,10,12,14,22,30,77,84,85,86,87,88,94,95],[2,86]),o($Vh,[2,87]),o($Vh,[2,88]),o($Vh,[2,89]),o($Vh,[2,90]),o($Vh,[2,91]),o($Vi,[2,123],{104:40,30:$V2}),o($Vj,[2,116]),{7:$V0,10:$V1,30:$V2,82:41,104:10,105:11},{7:[1,42],91:[1,43]},o($Vk,[2,95]),o($Vk,[2,96]),{1:[2,1]},o($Va,[2,184]),o($Vl,$Vm,{79:8,80:9,89:17,90:21,75:32,76:34,124:44,116:45,63:$Vn,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,91:$Vc,94:$V8,95:$V9}),o($Vo,[2,76]),{22:[1,48],77:[1,47]},o($Vl,[2,82]),{75:50,76:34,79:8,80:9,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,91:$Vc,94:$V8,95:$V9,116:49},o($Va,[2,190]),o($Vp,[2,166]),{6:84,7:$Vq,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,75:32,76:34,77:$VD,79:8,80:9,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,91:$Vc,93:[1,51],94:$V8,95:$V9,114:54,115:55,116:56,117:57,118:58,119:59,120:60,121:$VE,122:$VF,123:52,124:53,125:$VG,127:$VH,128:$VI,129:$VJ,130:$VK,131:$VL,132:$VM,133:$VN},{7:$V0,10:$V1,30:$V2,77:$Vb,78:28,81:29,82:103,104:10,105:11},o($Vd,[2,79]),o($Vd,[2,81]),o($Ve,[2,114],{10:$Vf,14:$Vg}),{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,15:[1,105],19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:106,74:104},{7:[1,113],12:[1,111],76:115,79:8,80:9,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,94:$V8,95:$V9,106:109,107:110,108:112,110:114},o($Vi,[2,124]),{12:[1,116]},o($Vh,[2,94],{91:[1,117]}),{80:121,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,92:118,94:$V8,95:$V9,96:119,97:120},{75:50,76:34,79:8,80:9,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,91:$Vc,94:$V8,95:$V9,116:122},o($Va,[2,188]),{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,21:124,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,83:123,91:$VP},o($Vo,[2,77]),{7:$V0,10:$V1,30:$V2,81:126,82:103,104:10,105:11},o($Va,[2,189]),o($Vp,[2,167]),o($VQ,[2,162]),{6:84,7:$Vq,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:$VD,91:$Vc,93:[1,127],114:128,115:55,116:56,117:57,118:58,119:59,120:60,121:$VE,122:$VF,125:$VG,127:$VH,128:$VI,129:$VJ,130:$VK,131:$VL,132:$VM,133:$VN},{6:84,7:$Vq,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,75:50,76:34,77:$VD,79:8,80:9,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,91:$Vc,93:[1,129],94:$V8,95:$V9,114:54,115:55,116:56,117:57,118:58,119:59,120:60,121:$VE,122:$VF,123:130,125:$VG,127:$VH,128:$VI,129:$VJ,130:$VK,131:$VL,132:$VM,133:$VN},o($VR,[2,168]),o($VS,[2,153]),o($VS,[2,154]),o($VS,[2,155]),o($VS,[2,156]),o($VS,[2,157]),o($VS,[2,158]),o([10,14,17,18,19,20,22,29,30,31,32,36,37,40,41,43,44,45,46,48,49,52,54,56,58,60,63,64,65,66,67,68,69,70,71,72,73,77],$VT,{61:[1,131]}),{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:106,74:132},{61:[1,133]},o($VU,[2,170]),{22:$VV,77:[1,134]},{10:[1,136]},{10:[1,137]},{10:[1,138]},{6:84,7:$Vq,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:$VD,91:$Vc,114:139,115:55,116:56,117:57,118:58,119:59,120:60,121:$VE,122:$VF,125:$VG,127:$VH,128:$VI,129:$VJ,130:$VK,131:$VL,132:$VM,133:$VN},{10:[1,140]},{77:[1,141]},{77:[1,142]},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,11:144,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:[1,143]},o($VW,[2,73]),o($VX,[2,60]),o($VY,$VZ,{62:145,63:[1,146],64:[1,147],65:[1,148],66:[1,149],67:[1,150],68:[1,151],69:[1,152],70:[1,153],71:[1,154],72:[1,155],73:[1,156]}),o($VX,[2,58],{58:[1,158],60:[1,157]}),o($V_,[2,16],{10:[1,160],14:[1,159],17:[1,161],18:[1,162],19:[1,163],20:[1,164]}),{6:84,7:$VO,8:$Vr,9:$Vs,10:$V$,13:78,19:$Vu,23:165,24:$Vv,25:81,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC},{6:84,7:$VO,8:$Vr,9:$Vs,10:$V$,13:78,19:$Vu,23:167,24:$Vv,25:81,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:168,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC},{6:84,7:$VO,8:$Vr,9:$Vs,10:[1,170],13:78,19:$Vu,23:169,24:$Vv,25:81,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC},o($V01,[2,56],{56:$V11}),o($V21,[2,6]),o($V31,[2,22]),o($V31,[2,23]),o($V31,[2,24]),o($V31,[2,25]),o($V31,[2,26]),o($V31,[2,27]),o($V41,[2,54],{54:$V51}),o($V21,[2,3]),o($V21,[2,4]),{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,11:173,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,28:174,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,80:121,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,94:$V8,95:$V9,97:175},o($V61,[2,52],{52:$V71}),o($V81,[2,50],{29:$V91}),o($Va1,[2,48],{48:$Vb1,49:$Vc1}),o($Vd1,[2,45],{43:$Ve1,44:$Vf1,45:$Vg1,46:$Vh1}),o($Vi1,[2,40],{40:$Vj1,41:$Vk1}),o($Vl1,[2,37],{31:$Vm1,32:$Vn1}),o($Vo1,[2,34],{30:$Vp1,36:$Vq1,37:$Vr1}),o($VY,[2,30]),o($Vl,$Vm,{63:$Vn}),{15:[1,191]},o($Vj,[2,119]),o([15,22,61,77],[2,75]),o($V_,$VZ),o($V21,$VT),{12:[1,192]},{12:[1,193],22:[1,194]},o($Vj,[2,122]),{12:[2,125],22:[1,195]},o($Vs1,[2,132]),o($Vs1,[2,127]),o($Vs1,[2,131],{105:11,82:196,111:197,104:198,112:199,7:$V0,10:$Vt1,14:$Vu1,30:$V2}),o($Vj,[2,117]),{80:121,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,92:202,94:$V8,95:$V9,96:119,97:120},{80:121,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,93:[1,203],94:$V8,95:$V9,96:204,97:120},o($Vv1,[2,97]),{7:$V0,10:$V1,30:$V2,61:$Vw1,82:207,98:205,99:206,104:10,105:11},o($Vx1,[2,101],{89:17,90:21,80:121,97:209,85:$V4,86:$V5,87:$V6,88:$V7,94:$V8,95:$V9}),o($Va,[2,187]),o($Vl,[2,85]),o($Vy1,[2,148]),{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,21:124,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,83:211,91:$VP,113:210},o($Vl,[2,83]),o($VQ,[2,163]),o($VR,[2,169]),o($VQ,[2,164]),{6:84,7:$Vq,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:$VD,91:$Vc,93:[1,212],114:128,115:55,116:56,117:57,118:58,119:59,120:60,121:$VE,122:$VF,125:$VG,127:$VH,128:$VI,129:$VJ,130:$VK,131:$VL,132:$VM,133:$VN},{6:84,7:$Vq,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:$VD,91:$Vc,114:213,115:55,116:56,117:57,118:58,119:59,120:60,121:$VE,122:$VF,125:$VG,127:$VH,128:$VI,129:$VJ,130:$VK,131:$VL,132:$VM,133:$VN},{61:[1,214]},{6:84,7:$Vq,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:$VD,91:$Vc,114:215,115:55,116:56,117:57,118:58,119:59,120:60,121:$VE,122:$VF,125:$VG,127:$VH,128:$VI,129:$VJ,130:$VK,131:$VL,132:$VM,133:$VN},o($VU,[2,171]),{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,21:216,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,11:217,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,11:218,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,11:219,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75},{128:[1,220]},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:$VD,117:221},o($VS,[2,179]),o($VS,[2,180]),o($VS,[2,181]),{22:$VV,77:[1,222]},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,21:223,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75},o($V31,[2,62]),o($V31,[2,63]),o($V31,[2,64]),o($V31,[2,65]),o($V31,[2,66]),o($V31,[2,67]),o($V31,[2,68]),o($V31,[2,69]),o($V31,[2,70]),o($V31,[2,71]),o($V31,[2,72]),{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,11:224,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:225},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,11:226,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,12:[1,227],13:78,16:228,19:$Vu,21:229,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75},{7:[1,230]},{7:[1,231]},o($V21,[2,12]),o($V21,[2,13]),o($V_,[2,17]),{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,11:173,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75},o($V_,[2,18]),o($V_,[2,19]),o($V_,[2,20]),{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,11:173,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,28:232,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,80:121,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,94:$V8,95:$V9,97:175},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:233},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:234},{12:[1,235],22:$VV},{12:[1,236]},{10:$Vz1,12:[2,134],14:$Vu1,30:$V2,104:238,111:237,112:199},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:240},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:241},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:242},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:243},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:244},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:245},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:246},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:247},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:248},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:249},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:250},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:251},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:252,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:253,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:254,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC},o($Vj,[2,118]),o($Vj,[2,120]),o($Vj,[2,121]),{7:[1,255]},{76:115,79:8,80:9,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,94:$V8,95:$V9,109:[1,256],110:257},o($Vs1,[2,129]),o($Vs1,[2,130]),o($Vs1,$VA1,{105:37,112:258,7:$V0,10:$Vt1,14:$Vu1}),o($Vs1,[2,137],{10:$VB1,14:$VC1}),{7:$V0,10:$Vt1,12:$VD1,14:$Vu1,30:$V2,76:115,79:8,80:9,82:41,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,94:$V8,95:$V9,104:198,105:11,106:263,108:112,110:114,111:261,112:199},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,15:[1,264],19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:106,74:265},{80:121,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,93:[1,266],94:$V8,95:$V9,96:204,97:120},o($Vh,[2,93]),o($Vv1,[2,98]),{22:[1,268],77:[1,267]},o($Vl,[2,102]),o($Vl,[2,104],{61:[1,269]}),{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:106,74:270},o($Vx1,[2,100]),{22:[1,272],93:[1,271]},o($VE1,[2,151]),o($VQ,[2,165]),o($VS,[2,159]),{6:84,7:$Vq,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:$VD,91:$Vc,114:273,115:55,116:56,117:57,118:58,119:59,120:60,121:$VE,122:$VF,125:$VG,127:$VH,128:$VI,129:$VJ,130:$VK,131:$VL,132:$VM,133:$VN},o($VS,[2,161]),o($VW,[2,74]),{12:[1,274],22:$VV},{12:[1,275],22:$VV},{12:[1,276],22:$VV},{10:[1,277]},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:$VD,117:278},o($VS,[2,182]),o($VX,[2,61]),{22:$VV,61:[1,279]},o($V01,[2,57],{56:$V11}),{15:[1,280],22:$VV},o($V21,[2,8]),{12:[1,281],22:[1,282]},o($Vs1,[2,14]),o($V21,[2,10]),o($V21,[2,11]),{12:[1,283]},o($V41,[2,55],{54:$V51}),o($V61,[2,53],{52:$V71}),o($V21,[2,5]),{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:284,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC},{12:[2,135]},{10:$Vz1,12:$VA1,14:$Vu1,112:258},{10:$Vz1,12:$VD1,14:$Vu1,30:$V2,76:115,79:8,80:9,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,94:$V8,95:$V9,104:238,106:263,108:112,110:114,111:261,112:199},o($V81,[2,51],{29:$V91}),o($Va1,[2,49],{48:$Vb1,49:$Vc1}),o($Vd1,[2,46],{43:$Ve1,44:$Vf1,45:$Vg1,46:$Vh1}),o($Vd1,[2,47],{43:$Ve1,44:$Vf1,45:$Vg1,46:$Vh1}),o($Vi1,[2,41],{40:$Vj1,41:$Vk1}),o($Vi1,[2,42],{40:$Vj1,41:$Vk1}),o($Vi1,[2,43],{40:$Vj1,41:$Vk1}),o($Vi1,[2,44],{40:$Vj1,41:$Vk1}),o($Vl1,[2,38],{31:$Vm1,32:$Vn1}),o($Vl1,[2,39],{31:$Vm1,32:$Vn1}),o($Vo1,[2,35],{30:$Vp1,36:$Vq1,37:$Vr1}),o($Vo1,[2,36],{30:$Vp1,36:$Vq1,37:$Vr1}),o($VY,[2,31]),o($VY,[2,32]),o($VY,[2,33]),o($Vs1,[2,133]),{12:[2,126]},o($Vs1,[2,128]),o($Vs1,[2,138],{10:$VB1,14:$VC1}),{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,15:[1,285],19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:106,74:286},{12:[1,287],76:115,79:8,80:9,84:$V3,85:$V4,86:$V5,87:$V6,88:$V7,89:17,90:21,94:$V8,95:$V9,106:288,108:112,110:114},{12:[1,289]},o($VF1,[2,144]),{12:[1,290]},o($VF1,[2,140]),{15:[1,291]},o($Vh,[2,92]),o($Vv1,[2,99]),{7:$V0,10:$V1,30:$V2,61:$Vw1,82:207,99:292,104:10,105:11},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:106,74:293},o($Vl,[2,105]),o($Vy1,[2,149]),{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,21:124,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,83:295,91:$VP,93:[1,294]},o($VS,[2,160]),{6:84,7:$Vq,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:$VD,91:$Vc,114:296,115:55,116:56,117:57,118:58,119:59,120:60,121:$VE,122:$VF,125:$VG,127:$VH,128:$VI,129:$VJ,130:$VK,131:$VL,132:$VM,133:$VN},{6:84,7:$Vq,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:$VD,91:$Vc,114:297,115:55,116:56,117:57,118:58,119:59,120:60,121:$VE,122:$VF,125:$VG,127:$VH,128:$VI,129:$VJ,130:$VK,131:$VL,132:$VM,133:$VN},{6:84,7:$Vq,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:$VD,91:$Vc,114:298,115:55,116:56,117:57,118:58,119:59,120:60,121:$VE,122:$VF,125:$VG,127:$VH,128:$VI,129:$VJ,130:$VK,131:$VL,132:$VM,133:$VN},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,11:299,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,11:301,12:[1,300],13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75},{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,23:107,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:302},o($V21,[2,7]),o($V21,[2,9]),{6:84,7:$VO,8:$Vr,9:$Vs,10:$Vt,13:78,19:$Vu,21:303,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75},o($V_,[2,21]),o($V_,[2,29]),o($VF1,[2,142]),{15:[1,304]},o($VF1,[2,146]),{12:[1,305]},o($VF1,[2,139]),o($VF1,[2,145]),o($VF1,[2,141]),o($Vl,[2,103]),o($Vl,[2,106]),o($Vy1,[2,150]),o($VE1,[2,152]),o($VR,[2,172],{126:[1,306]}),o($VS,[2,174]),o($VS,[2,175]),{12:[1,307],22:$VV},{6:84,7:$Vq,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:$VD,91:$Vc,114:308,115:55,116:56,117:57,118:58,119:59,120:60,121:$VE,122:$VF,125:$VG,127:$VH,128:$VI,129:$VJ,130:$VK,131:$VL,132:$VM,133:$VN},{12:[1,309],22:$VV},o($VX,[2,59]),o($Vs1,[2,15]),o($VF1,[2,143]),o($VF1,[2,147]),{6:84,7:$Vq,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:$VD,91:$Vc,114:310,115:55,116:56,117:57,118:58,119:59,120:60,121:$VE,122:$VF,125:$VG,127:$VH,128:$VI,129:$VJ,130:$VK,131:$VL,132:$VM,133:$VN},{77:[1,311]},o($VS,[2,177]),{6:84,7:$Vq,8:$Vr,9:$Vs,10:$Vt,11:65,13:78,19:$Vu,21:74,23:76,24:$Vv,25:81,26:102,27:$Vw,29:$Vx,30:$Vy,31:$Vz,32:$VA,33:$VB,34:$VC,35:101,38:100,39:99,42:98,47:97,50:96,51:95,53:91,55:83,57:77,59:75,77:$VD,91:$Vc,114:312,115:55,116:56,117:57,118:58,119:59,120:60,121:$VE,122:$VF,125:$VG,127:$VH,128:$VI,129:$VJ,130:$VK,131:$VL,132:$VM,133:$VN},o($VS,[2,173]),o($VS,[2,176]),o($VS,[2,178])],
defaultActions: {24:[2,1],237:[2,135],256:[2,126]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        function _parseError (msg, hash) {
            this.message = msg;
            this.hash = hash;
        }
        _parseError.prototype = Error;

        throw new _parseError(str, hash);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        var lex = function () {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        };
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};

    var symbolTable;
 
var parserUtils = require('./parserUtils.js');
/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:/* IGNORE */                                 
break;
case 1:/* IGNORE */
break;
case 2:/* IGNORE */
break;
case 3:return 8
break;
case 4:return 70
break;
case 5:return 69
break;
case 6:return 67
break;
case 7:return 68
break;
case 8:return 64
break;
case 9:return 65
break;
case 10:return 66
break;
case 11:return 71
break;
case 12:return 72
break;
case 13:return 73
break;
case 14:return 41
break;
case 15:return 40
break;
case 16:return 19
break;
case 17:return 24
break;
case 18:return 18
break;
case 19:return 56
break;
case 20:return 58
break;
case 21:return 45
break;
case 22:return 46
break;
case 23:return 48
break;
case 24:return 49
break;
case 25:return 77
break;
case 26:return 91
break;
case 27:return 93
break;
case 28:return 22
break;
case 29:return 61
break;
case 30:return 63
break;
case 31:return 10
break;
case 32:return 12
break;
case 33:return 14
break;
case 34:return 15
break;
case 35:return 17
break;
case 36:return 29
break;
case 37:return 34
break;
case 38:return 33
break;
case 39:return 32
break;
case 40:return 31
break;
case 41:return 30
break;
case 42:return 36
break;
case 43:return 37
break;
case 44:return 43
break;
case 45:return 44
break;
case 46:return 52
break;
case 47:return 54
break;
case 48:return 60
break;
case 49:return 132
break;
case 50:return 121
break;
case 51:return 86
break;
case 52:return 131
break;
case 53:return 122
break;
case 54:return 129
break;
case 55:return 88
break;
case 56:return 126
break;
case 57:return 'FLOAT'
break;
case 58:return 130
break;
case 59:return 125
break;
case 60:return 87
break;
case 61:return 'LONG'
break;
case 62:return 133
break;
case 63:return 'SHORT'
break;
case 64:return 'SIGNED'
break;
case 65:return 27
break;
case 66:return 94
break;
case 67:return 127
break;
case 68:return 84
break;
case 69:return 95
break;
case 70:return 'UNSIGNED'
break;
case 71:return 'VOID'
break;
case 72:return 128
break;
case 73:return 7 
break;
case 74:return 9
break;
case 75:return 5
break;
case 76:return 'INVALID'
break;
}
},
rules: [/^(?:[\t\v\n\f\s]+)/,/^(?:\/\/.*)/,/^(?:[\/][*][^*]*[*]+([^\/*][^*]*[*]+)*[\/])/,/^(?:[0-9]+(\.[0-9]+)?\b)/,/^(?:>>=)/,/^(?:<<=)/,/^(?:\+=)/,/^(?:-=)/,/^(?:\*=)/,/^(?:\/=)/,/^(?:%=)/,/^(?:&=)/,/^(?:\^=)/,/^(?:\|=)/,/^(?:>>)/,/^(?:<<)/,/^(?:\+\+)/,/^(?:--)/,/^(?:->)/,/^(?:&&)/,/^(?:\|\|)/,/^(?:<=)/,/^(?:>=)/,/^(?:==)/,/^(?:!=)/,/^(?:;)/,/^(?:\{)/,/^(?:\})/,/^(?:,)/,/^(?::)/,/^(?:=)/,/^(?:\()/,/^(?:\))/,/^(?:\[)/,/^(?:\])/,/^(?:\.)/,/^(?:&)/,/^(?:!)/,/^(?:~)/,/^(?:-)/,/^(?:\+)/,/^(?:\*)/,/^(?:\/)/,/^(?:%)/,/^(?:<)/,/^(?:>)/,/^(?:\^)/,/^(?:\|)/,/^(?:\?)/,/^(?:break\b)/,/^(?:case\b)/,/^(?:char\b)/,/^(?:continue\b)/,/^(?:default\b)/,/^(?:do\b)/,/^(?:double\b)/,/^(?:else\b)/,/^(?:float\b)/,/^(?:for\b)/,/^(?:if\b)/,/^(?:int\b)/,/^(?:long\b)/,/^(?:return\b)/,/^(?:short\b)/,/^(?:signed\b)/,/^(?:sizeof\b)/,/^(?:struct\b)/,/^(?:switch\b)/,/^(?:typedef\b)/,/^(?:union\b)/,/^(?:unsigned\b)/,/^(?:void\b)/,/^(?:while\b)/,/^(?:[_a-zA-Z][_a-zA-Z0-9]*)/,/^(?:"[^"]+")/,/^(?:$)/,/^(?:.)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76],"inclusive":true}}
});
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = ansic;
exports.Parser = ansic.Parser;
exports.parse = function () { return ansic.parse.apply(ansic, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
}).call(this,require('_process'))
},{"./parserUtils.js":6,"_process":3,"fs":1,"path":2}],6:[function(require,module,exports){
module.exports.debug = function(){
    console.log('exports is of course working');
}


var symbolTable = {};
module.exports.symbolTable = symbolTable;

var typeEnum = {
    INT: 1,
    DOUBLE : 2
};
module.exports.typeEnum = typeEnum;


var clearSymbolTable = function(){
    symbolTable = {};
}
module.exports.clearSymbolTable = clearSymbolTable;

var addInitialSymbolTable = function(key, value){
    symbolTable[key] = value;
}

module.exports.addInitialSymbolTable = addInitialSymbolTable;

var printSymbolTable  = function(){
    console.log("Print symbol table.");
    for(key in symbolTable){
        console.log("Key: " + key + " Value: " + symbolTable[key]);
    }
}

module.exports.printSymbolTable = printSymbolTable;

var generateTuple = function(val, typ){
    return Object.freeze({value: val, type: typ });
}

module.exports.generateTuple = generateTuple;
},{}]},{},[4]);
