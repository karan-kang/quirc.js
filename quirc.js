// Quirc.Js
// UMD compatiable module
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	factory(self || window || {});
}
	(this, (function (exports) {
			var noop = function() {};
			var Module;
			if (!Module)
				Module = (typeof Module !== "undefined" ? Module : null) || {};
			var moduleOverrides = {};
			for (var key in Module) {
				if (Module.hasOwnProperty(key)) {
					moduleOverrides[key] = Module[key]
				}
			}
			
			// Count callback function
			Module.counted = noop;
			// Decode callback function
			Module.decoded = noop;
			
			var ENVIRONMENT_IS_WEB = typeof window === "object";
			var ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB;
			var ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
			var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
			if (ENVIRONMENT_IS_NODE) {
				if (!Module["print"])
					Module["print"] = function print(x) {
						process["stdout"].write(x + "\n")
					};
				if (!Module["printErr"])
					Module["printErr"] = function printErr(x) {
						process["stderr"].write(x + "\n")
					};
				var nodeFS = require("fs");
				var nodePath = require("path");
				Module["read"] = function read(filename, binary) {
					filename = nodePath["normalize"](filename);
					var ret = nodeFS["readFileSync"](filename);
					if (!ret && filename != nodePath["resolve"](filename)) {
						filename = path.join(__dirname, "..", "src", filename);
						ret = nodeFS["readFileSync"](filename)
					}
					if (ret && !binary)
						ret = ret.toString();
					return ret
				};
				Module["readBinary"] = function readBinary(filename) {
					return Module["read"](filename, true)
				};
				Module["load"] = function load(f) {
					globalEval(read(f))
				};
				if (!Module["thisProgram"]) {
					if (process["argv"].length > 1) {
						Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/")
					} else {
						Module["thisProgram"] = "unknown-program"
					}
				}
				Module["arguments"] = process["argv"].slice(2);
				if (typeof module !== "undefined") {
					module["exports"] = Module
				}
				process["on"]("uncaughtException", (function (ex) {
						if (!(ex instanceof ExitStatus)) {
							throw ex
						}
					}));
				Module["inspect"] = (function () {
					return "[Emscripten Module object]"
				})
			} else if (ENVIRONMENT_IS_SHELL) {
				if (!Module["print"])
					Module["print"] = print;
				if (typeof printErr != "undefined")
					Module["printErr"] = printErr;
				if (typeof read != "undefined") {
					Module["read"] = read
				} else {
					Module["read"] = function read() {
						throw "no read() available (jsc?)"
					}
				}
				Module["readBinary"] = function readBinary(f) {
					if (typeof readbuffer === "function") {
						return new Uint8Array(readbuffer(f))
					}
					var data = read(f, "binary");
					assert(typeof data === "object");
					return data
				};
				if (typeof scriptArgs != "undefined") {
					Module["arguments"] = scriptArgs
				} else if (typeof arguments != "undefined") {
					Module["arguments"] = arguments
				}
			} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
				Module["read"] = function read(url) {
					var xhr = new XMLHttpRequest;
					xhr.open("GET", url, false);
					xhr.send(null);
					return xhr.responseText
				};
				if (typeof arguments != "undefined") {
					Module["arguments"] = arguments
				}
				if (typeof console !== "undefined") {
					if (!Module["print"])
						Module["print"] = function print(x) {
							console.log(x)
						};
					if (!Module["printErr"])
						Module["printErr"] = function printErr(x) {
							console.log(x)
						}
				} else {
					var TRY_USE_DUMP = false;
					if (!Module["print"])
						Module["print"] = TRY_USE_DUMP && typeof dump !== "undefined" ? (function (x) {
								dump(x)
							}) : (function (x) {})
				}
				if (ENVIRONMENT_IS_WORKER) {
					Module["load"] = importScripts
				}
				if (typeof Module["setWindowTitle"] === "undefined") {
					Module["setWindowTitle"] = (function (title) {
						document.title = title
					})
				}
			} else {
				throw "Unknown runtime environment. Where are we?"
			}
			function globalEval(x) {
				eval.call(null, x)
			}
			if (!Module["load"] && Module["read"]) {
				Module["load"] = function load(f) {
					globalEval(Module["read"](f))
				}
			}
			if (!Module["print"]) {
				Module["print"] = (function () {})
			}
			if (!Module["printErr"]) {
				Module["printErr"] = Module["print"]
			}
			if (!Module["arguments"]) {
				Module["arguments"] = []
			}
			if (!Module["thisProgram"]) {
				Module["thisProgram"] = "./this.program"
			}
			Module.print = Module["print"];
			Module.printErr = Module["printErr"];
			Module["preRun"] = [];
			Module["postRun"] = [];
			for (var key in moduleOverrides) {
				if (moduleOverrides.hasOwnProperty(key)) {
					Module[key] = moduleOverrides[key]
				}
			}
			var Runtime = {
				setTempRet0: (function (value) {
					tempRet0 = value
				}),
				getTempRet0: (function () {
					return tempRet0
				}),
				stackSave: (function () {
					return STACKTOP
				}),
				stackRestore: (function (stackTop) {
					STACKTOP = stackTop
				}),
				getNativeTypeSize: (function (type) {
					switch (type) {
					case "i1":
					case "i8":
						return 1;
					case "i16":
						return 2;
					case "i32":
						return 4;
					case "i64":
						return 8;
					case "float":
						return 4;
					case "double":
						return 8;
					default: {
							if (type[type.length - 1] === "*") {
								return Runtime.QUANTUM_SIZE
							} else if (type[0] === "i") {
								var bits = parseInt(type.substr(1));
								assert(bits % 8 === 0);
								return bits / 8
							} else {
								return 0
							}
						}
					}
				}),
				getNativeFieldSize: (function (type) {
					return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE)
				}),
				STACK_ALIGN: 16,
				prepVararg: (function (ptr, type) {
					if (type === "double" || type === "i64") {
						if (ptr & 7) {
							assert((ptr & 7) === 4);
							ptr += 4
						}
					} else {
						assert((ptr & 3) === 0)
					}
					return ptr
				}),
				getAlignSize: (function (type, size, vararg) {
					if (!vararg && (type == "i64" || type == "double"))
						return 8;
					if (!type)
						return Math.min(size, 8);
					return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE)
				}),
				dynCall: (function (sig, ptr, args) {
					if (args && args.length) {
						if (!args.splice)
							args = Array.prototype.slice.call(args);
						args.splice(0, 0, ptr);
						return Module["dynCall_" + sig].apply(null, args)
					} else {
						return Module["dynCall_" + sig].call(null, ptr)
					}
				}),
				functionPointers: [],
				addFunction: (function (func) {
					for (var i = 0; i < Runtime.functionPointers.length; i++) {
						if (!Runtime.functionPointers[i]) {
							Runtime.functionPointers[i] = func;
							return 2 * (1 + i)
						}
					}
					throw "Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS."
				}),
				removeFunction: (function (index) {
					Runtime.functionPointers[(index - 2) / 2] = null
				}),
				warnOnce: (function (text) {
					if (!Runtime.warnOnce.shown)
						Runtime.warnOnce.shown = {};
					if (!Runtime.warnOnce.shown[text]) {
						Runtime.warnOnce.shown[text] = 1;
						Module.printErr(text)
					}
				}),
				funcWrappers: {},
				getFuncWrapper: (function (func, sig) {
					assert(sig);
					if (!Runtime.funcWrappers[sig]) {
						Runtime.funcWrappers[sig] = {}
					}
					var sigCache = Runtime.funcWrappers[sig];
					if (!sigCache[func]) {
						sigCache[func] = function dynCall_wrapper() {
							return Runtime.dynCall(sig, func, arguments)
						}
					}
					return sigCache[func]
				}),
				getCompilerSetting: (function (name) {
					throw "You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work"
				}),
				stackAlloc: (function (size) {
					var ret = STACKTOP;
					STACKTOP = STACKTOP + size | 0;
					STACKTOP = STACKTOP + 15 & -16;
					return ret
				}),
				staticAlloc: (function (size) {
					var ret = STATICTOP;
					STATICTOP = STATICTOP + size | 0;
					STATICTOP = STATICTOP + 15 & -16;
					return ret
				}),
				dynamicAlloc: (function (size) {
					var ret = DYNAMICTOP;
					DYNAMICTOP = DYNAMICTOP + size | 0;
					DYNAMICTOP = DYNAMICTOP + 15 & -16;
					if (DYNAMICTOP >= TOTAL_MEMORY) {
						var success = enlargeMemory();
						if (!success) {
							DYNAMICTOP = ret;
							return 0
						}
					}
					return ret
				}),
				alignMemory: (function (size, quantum) {
					var ret = size = Math.ceil(size / (quantum ? quantum : 16)) * (quantum ? quantum : 16);
					return ret
				}),
				makeBigInt: (function (low, high, unsigned) {
					var ret = unsigned ?  + (low >>> 0) +  + (high >>> 0) * +4294967296 :  + (low >>> 0) +  + (high | 0) * +4294967296;
					return ret
				}),
				GLOBAL_BASE: 8,
				QUANTUM_SIZE: 4,
				__dummy__: 0
			};
			Module["Runtime"] = Runtime;
			var __THREW__ = 0;
			var ABORT = false;
			var EXITSTATUS = 0;
			var undef = 0;
			var tempValue,
			tempInt,
			tempBigInt,
			tempInt2,
			tempBigInt2,
			tempPair,
			tempBigIntI,
			tempBigIntR,
			tempBigIntS,
			tempBigIntP,
			tempBigIntD,
			tempDouble,
			tempFloat;
			var tempI64,
			tempI64b;
			var tempRet0,
			tempRet1,
			tempRet2,
			tempRet3,
			tempRet4,
			tempRet5,
			tempRet6,
			tempRet7,
			tempRet8,
			tempRet9;
			function assert(condition, text) {
				if (!condition) {
					abort("Assertion failed: " + text)
				}
			}
			var globalScope = this;
			function getCFunc(ident) {
				var func = Module["_" + ident];
				if (!func) {
					try {
						func = eval("_" + ident)
					} catch (e) {}
				}
				assert(func, "Cannot call unknown function " + ident + " (perhaps LLVM optimizations or closure removed it?)");
				return func
			}
			var cwrap,
			ccall;
			((function () {
					var JSfuncs = {
						"stackSave": (function () {
							Runtime.stackSave()
						}),
						"stackRestore": (function () {
							Runtime.stackRestore()
						}),
						"arrayToC": (function (arr) {
							var ret = Runtime.stackAlloc(arr.length);
							writeArrayToMemory(arr, ret);
							return ret
						}),
						"stringToC": (function (str) {
							var ret = 0;
							if (str !== null && str !== undefined && str !== 0) {
								ret = Runtime.stackAlloc((str.length << 2) + 1);
								writeStringToMemory(str, ret)
							}
							return ret
						})
					};
					var toC = {
						"string": JSfuncs["stringToC"],
						"array": JSfuncs["arrayToC"]
					};
					ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
						var func = getCFunc(ident);
						var cArgs = [];
						var stack = 0;
						if (args) {
							for (var i = 0; i < args.length; i++) {
								var converter = toC[argTypes[i]];
								if (converter) {
									if (stack === 0)
										stack = Runtime.stackSave();
									cArgs[i] = converter(args[i])
								} else {
									cArgs[i] = args[i]
								}
							}
						}
						var ret = func.apply(null, cArgs);
						if (returnType === "string")
							ret = Pointer_stringify(ret);
						if (stack !== 0) {
							if (opts && opts.async) {
								EmterpreterAsync.asyncFinalizers.push((function () {
										Runtime.stackRestore(stack)
									}));
								return
							}
							Runtime.stackRestore(stack)
						}
						return ret
					};
					var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
					function parseJSFunc(jsfunc) {
						var parsed = jsfunc.toString().match(sourceRegex).slice(1);
						return {
							arguments: parsed[0],
							body: parsed[1],
							returnValue: parsed[2]
						}
					}
					var JSsource = {};
					for (var fun in JSfuncs) {
						if (JSfuncs.hasOwnProperty(fun)) {
							JSsource[fun] = parseJSFunc(JSfuncs[fun])
						}
					}
					cwrap = function cwrap(ident, returnType, argTypes) {
						argTypes = argTypes || [];
						var cfunc = getCFunc(ident);
						var numericArgs = argTypes.every((function (type) {
									return type === "number"
								}));
						var numericRet = returnType !== "string";
						if (numericRet && numericArgs) {
							return cfunc
						}
						var argNames = argTypes.map((function (x, i) {
									return "$" + i
								}));
						var funcstr = "(function(" + argNames.join(",") + ") {";
						var nargs = argTypes.length;
						if (!numericArgs) {
							funcstr += "var stack = " + JSsource["stackSave"].body + ";";
							for (var i = 0; i < nargs; i++) {
								var arg = argNames[i],
								type = argTypes[i];
								if (type === "number")
									continue;
								var convertCode = JSsource[type + "ToC"];
								funcstr += "var " + convertCode.arguments + " = " + arg + ";";
								funcstr += convertCode.body + ";";
								funcstr += arg + "=" + convertCode.returnValue + ";"
							}
						}
						var cfuncname = parseJSFunc((function () {
									return cfunc
								})).returnValue;
						funcstr += "var ret = " + cfuncname + "(" + argNames.join(",") + ");";
						if (!numericRet) {
							var strgfy = parseJSFunc((function () {
										return Pointer_stringify
									})).returnValue;
							funcstr += "ret = " + strgfy + "(ret);"
						}
						if (!numericArgs) {
							funcstr += JSsource["stackRestore"].body.replace("()", "(stack)") + ";"
						}
						funcstr += "return ret})";
						return eval(funcstr)
					}
				}))();
			Module["cwrap"] = cwrap;
			Module["ccall"] = ccall;
			function setValue(ptr, value, type, noSafe) {
				type = type || "i8";
				if (type.charAt(type.length - 1) === "*")
					type = "i32";
				switch (type) {
				case "i1":
					HEAP8[ptr >> 0] = value;
					break;
				case "i8":
					HEAP8[ptr >> 0] = value;
					break;
				case "i16":
					HEAP16[ptr >> 1] = value;
					break;
				case "i32":
					HEAP32[ptr >> 2] = value;
					break;
				case "i64":
					tempI64 = [value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= +1 ? tempDouble > +0 ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble -  + (~~tempDouble >>> 0)) / +4294967296) >>> 0 : 0)],
					HEAP32[ptr >> 2] = tempI64[0],
					HEAP32[ptr + 4 >> 2] = tempI64[1];
					break;
				case "float":
					HEAPF32[ptr >> 2] = value;
					break;
				case "double":
					HEAPF64[ptr >> 3] = value;
					break;
				default:
					abort("invalid type for setValue: " + type)
				}
			}
			Module["setValue"] = setValue;
			function getValue(ptr, type, noSafe) {
				type = type || "i8";
				if (type.charAt(type.length - 1) === "*")
					type = "i32";
				switch (type) {
				case "i1":
					return HEAP8[ptr >> 0];
				case "i8":
					return HEAP8[ptr >> 0];
				case "i16":
					return HEAP16[ptr >> 1];
				case "i32":
					return HEAP32[ptr >> 2];
				case "i64":
					return HEAP32[ptr >> 2];
				case "float":
					return HEAPF32[ptr >> 2];
				case "double":
					return HEAPF64[ptr >> 3];
				default:
					abort("invalid type for setValue: " + type)
				}
				return null
			}
			Module["getValue"] = getValue;
			var ALLOC_NORMAL = 0;
			var ALLOC_STACK = 1;
			var ALLOC_STATIC = 2;
			var ALLOC_DYNAMIC = 3;
			var ALLOC_NONE = 4;
			Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
			Module["ALLOC_STACK"] = ALLOC_STACK;
			Module["ALLOC_STATIC"] = ALLOC_STATIC;
			Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
			Module["ALLOC_NONE"] = ALLOC_NONE;
			function allocate(slab, types, allocator, ptr) {
				var zeroinit,
				size;
				if (typeof slab === "number") {
					zeroinit = true;
					size = slab
				} else {
					zeroinit = false;
					size = slab.length
				}
				var singleType = typeof types === "string" ? types : null;
				var ret;
				if (allocator == ALLOC_NONE) {
					ret = ptr
				} else {
					ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length))
				}
				if (zeroinit) {
					var ptr = ret,
					stop;
					assert((ret & 3) == 0);
					stop = ret + (size & ~3);
					for (; ptr < stop; ptr += 4) {
						HEAP32[ptr >> 2] = 0
					}
					stop = ret + size;
					while (ptr < stop) {
						HEAP8[ptr++ >> 0] = 0
					}
					return ret
				}
				if (singleType === "i8") {
					if (slab.subarray || slab.slice) {
						HEAPU8.set(slab, ret)
					} else {
						HEAPU8.set(new Uint8Array(slab), ret)
					}
					return ret
				}
				var i = 0,
				type,
				typeSize,
				previousType;
				while (i < size) {
					var curr = slab[i];
					if (typeof curr === "function") {
						curr = Runtime.getFunctionIndex(curr)
					}
					type = singleType || types[i];
					if (type === 0) {
						i++;
						continue
					}
					if (type == "i64")
						type = "i32";
					setValue(ret + i, curr, type);
					if (previousType !== type) {
						typeSize = Runtime.getNativeTypeSize(type);
						previousType = type
					}
					i += typeSize
				}
				return ret
			}
			Module["allocate"] = allocate;
			function getMemory(size) {
				if (!staticSealed)
					return Runtime.staticAlloc(size);
				if (typeof _sbrk !== "undefined" && !_sbrk.called || !runtimeInitialized)
					return Runtime.dynamicAlloc(size);
				return _malloc(size)
			}
			Module["getMemory"] = getMemory;
			function Pointer_stringify(ptr, length) {
				if (length === 0 || !ptr)
					return "";
				var hasUtf = 0;
				var t;
				var i = 0;
				while (1) {
					t = HEAPU8[ptr + i >> 0];
					hasUtf |= t;
					if (t == 0 && !length)
						break;
					i++;
					if (length && i == length)
						break
				}
				if (!length)
					length = i;
				var ret = "";
				if (hasUtf < 128) {
					var MAX_CHUNK = 1024;
					var curr;
					while (length > 0) {
						curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
						ret = ret ? ret + curr : curr;
						ptr += MAX_CHUNK;
						length -= MAX_CHUNK
					}
					return ret
				}
				return Module["UTF8ToString"](ptr)
			}
			Module["Pointer_stringify"] = Pointer_stringify;
			function AsciiToString(ptr) {
				var str = "";
				while (1) {
					var ch = HEAP8[ptr++ >> 0];
					if (!ch)
						return str;
					str += String.fromCharCode(ch)
				}
			}
			Module["AsciiToString"] = AsciiToString;
			function stringToAscii(str, outPtr) {
				return writeAsciiToMemory(str, outPtr, false)
			}
			Module["stringToAscii"] = stringToAscii;
			function UTF8ArrayToString(u8Array, idx) {
				var u0,
				u1,
				u2,
				u3,
				u4,
				u5;
				var str = "";
				while (1) {
					u0 = u8Array[idx++];
					if (!u0)
						return str;
					if (!(u0 & 128)) {
						str += String.fromCharCode(u0);
						continue
					}
					u1 = u8Array[idx++] & 63;
					if ((u0 & 224) == 192) {
						str += String.fromCharCode((u0 & 31) << 6 | u1);
						continue
					}
					u2 = u8Array[idx++] & 63;
					if ((u0 & 240) == 224) {
						u0 = (u0 & 15) << 12 | u1 << 6 | u2
					} else {
						u3 = u8Array[idx++] & 63;
						if ((u0 & 248) == 240) {
							u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3
						} else {
							u4 = u8Array[idx++] & 63;
							if ((u0 & 252) == 248) {
								u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4
							} else {
								u5 = u8Array[idx++] & 63;
								u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5
							}
						}
					}
					if (u0 < 65536) {
						str += String.fromCharCode(u0)
					} else {
						var ch = u0 - 65536;
						str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
					}
				}
			}
			Module["UTF8ArrayToString"] = UTF8ArrayToString;
			function UTF8ToString(ptr) {
				return UTF8ArrayToString(HEAPU8, ptr)
			}
			Module["UTF8ToString"] = UTF8ToString;
			function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
				if (!(maxBytesToWrite > 0))
					return 0;
				var startIdx = outIdx;
				var endIdx = outIdx + maxBytesToWrite - 1;
				for (var i = 0; i < str.length; ++i) {
					var u = str.charCodeAt(i);
					if (u >= 55296 && u <= 57343)
						u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
					if (u <= 127) {
						if (outIdx >= endIdx)
							break;
						outU8Array[outIdx++] = u
					} else if (u <= 2047) {
						if (outIdx + 1 >= endIdx)
							break;
						outU8Array[outIdx++] = 192 | u >> 6;
						outU8Array[outIdx++] = 128 | u & 63
					} else if (u <= 65535) {
						if (outIdx + 2 >= endIdx)
							break;
						outU8Array[outIdx++] = 224 | u >> 12;
						outU8Array[outIdx++] = 128 | u >> 6 & 63;
						outU8Array[outIdx++] = 128 | u & 63
					} else if (u <= 2097151) {
						if (outIdx + 3 >= endIdx)
							break;
						outU8Array[outIdx++] = 240 | u >> 18;
						outU8Array[outIdx++] = 128 | u >> 12 & 63;
						outU8Array[outIdx++] = 128 | u >> 6 & 63;
						outU8Array[outIdx++] = 128 | u & 63
					} else if (u <= 67108863) {
						if (outIdx + 4 >= endIdx)
							break;
						outU8Array[outIdx++] = 248 | u >> 24;
						outU8Array[outIdx++] = 128 | u >> 18 & 63;
						outU8Array[outIdx++] = 128 | u >> 12 & 63;
						outU8Array[outIdx++] = 128 | u >> 6 & 63;
						outU8Array[outIdx++] = 128 | u & 63
					} else {
						if (outIdx + 5 >= endIdx)
							break;
						outU8Array[outIdx++] = 252 | u >> 30;
						outU8Array[outIdx++] = 128 | u >> 24 & 63;
						outU8Array[outIdx++] = 128 | u >> 18 & 63;
						outU8Array[outIdx++] = 128 | u >> 12 & 63;
						outU8Array[outIdx++] = 128 | u >> 6 & 63;
						outU8Array[outIdx++] = 128 | u & 63
					}
				}
				outU8Array[outIdx] = 0;
				return outIdx - startIdx
			}
			Module["stringToUTF8Array"] = stringToUTF8Array;
			function stringToUTF8(str, outPtr, maxBytesToWrite) {
				return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
			}
			Module["stringToUTF8"] = stringToUTF8;
			function lengthBytesUTF8(str) {
				var len = 0;
				for (var i = 0; i < str.length; ++i) {
					var u = str.charCodeAt(i);
					if (u >= 55296 && u <= 57343)
						u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
					if (u <= 127) {
						++len
					} else if (u <= 2047) {
						len += 2
					} else if (u <= 65535) {
						len += 3
					} else if (u <= 2097151) {
						len += 4
					} else if (u <= 67108863) {
						len += 5
					} else {
						len += 6
					}
				}
				return len
			}
			Module["lengthBytesUTF8"] = lengthBytesUTF8;
			function UTF16ToString(ptr) {
				var i = 0;
				var str = "";
				while (1) {
					var codeUnit = HEAP16[ptr + i * 2 >> 1];
					if (codeUnit == 0)
						return str;
					++i;
					str += String.fromCharCode(codeUnit)
				}
			}
			Module["UTF16ToString"] = UTF16ToString;
			function stringToUTF16(str, outPtr, maxBytesToWrite) {
				if (maxBytesToWrite === undefined) {
					maxBytesToWrite = 2147483647
				}
				if (maxBytesToWrite < 2)
					return 0;
				maxBytesToWrite -= 2;
				var startPtr = outPtr;
				var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
				for (var i = 0; i < numCharsToWrite; ++i) {
					var codeUnit = str.charCodeAt(i);
					HEAP16[outPtr >> 1] = codeUnit;
					outPtr += 2
				}
				HEAP16[outPtr >> 1] = 0;
				return outPtr - startPtr
			}
			Module["stringToUTF16"] = stringToUTF16;
			function lengthBytesUTF16(str) {
				return str.length * 2
			}
			Module["lengthBytesUTF16"] = lengthBytesUTF16;
			function UTF32ToString(ptr) {
				var i = 0;
				var str = "";
				while (1) {
					var utf32 = HEAP32[ptr + i * 4 >> 2];
					if (utf32 == 0)
						return str;
					++i;
					if (utf32 >= 65536) {
						var ch = utf32 - 65536;
						str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
					} else {
						str += String.fromCharCode(utf32)
					}
				}
			}
			Module["UTF32ToString"] = UTF32ToString;
			function stringToUTF32(str, outPtr, maxBytesToWrite) {
				if (maxBytesToWrite === undefined) {
					maxBytesToWrite = 2147483647
				}
				if (maxBytesToWrite < 4)
					return 0;
				var startPtr = outPtr;
				var endPtr = startPtr + maxBytesToWrite - 4;
				for (var i = 0; i < str.length; ++i) {
					var codeUnit = str.charCodeAt(i);
					if (codeUnit >= 55296 && codeUnit <= 57343) {
						var trailSurrogate = str.charCodeAt(++i);
						codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023
					}
					HEAP32[outPtr >> 2] = codeUnit;
					outPtr += 4;
					if (outPtr + 4 > endPtr)
						break
				}
				HEAP32[outPtr >> 2] = 0;
				return outPtr - startPtr
			}
			Module["stringToUTF32"] = stringToUTF32;
			function lengthBytesUTF32(str) {
				var len = 0;
				for (var i = 0; i < str.length; ++i) {
					var codeUnit = str.charCodeAt(i);
					if (codeUnit >= 55296 && codeUnit <= 57343)
						++i;
					len += 4
				}
				return len
			}
			Module["lengthBytesUTF32"] = lengthBytesUTF32;
			function demangle(func) {
				var hasLibcxxabi = !!Module["___cxa_demangle"];
				if (hasLibcxxabi) {
					try {
						var buf = _malloc(func.length);
						writeStringToMemory(func.substr(1), buf);
						var status = _malloc(4);
						var ret = Module["___cxa_demangle"](buf, 0, 0, status);
						if (getValue(status, "i32") === 0 && ret) {
							return Pointer_stringify(ret)
						}
					} catch (e) {}
					finally {
						if (buf)
							_free(buf);
						if (status)
							_free(status);
						if (ret)
							_free(ret)
					}
				}
				var i = 3;
				var basicTypes = {
					"v": "void",
					"b": "bool",
					"c": "char",
					"s": "short",
					"i": "int",
					"l": "long",
					"f": "float",
					"d": "double",
					"w": "wchar_t",
					"a": "signed char",
					"h": "unsigned char",
					"t": "unsigned short",
					"j": "unsigned int",
					"m": "unsigned long",
					"x": "long long",
					"y": "unsigned long long",
					"z": "..."
				};
				var subs = [];
				var first = true;
				function dump(x) {
					if (x)
						Module.print(x);
					Module.print(func);
					var pre = "";
					for (var a = 0; a < i; a++)
						pre += " ";
					Module.print(pre + "^")
				}
				function parseNested() {
					i++;
					if (func[i] === "K")
						i++;
					var parts = [];
					while (func[i] !== "E") {
						if (func[i] === "S") {
							i++;
							var next = func.indexOf("_", i);
							var num = func.substring(i, next) || 0;
							parts.push(subs[num] || "?");
							i = next + 1;
							continue
						}
						if (func[i] === "C") {
							parts.push(parts[parts.length - 1]);
							i += 2;
							continue
						}
						var size = parseInt(func.substr(i));
						var pre = size.toString().length;
						if (!size || !pre) {
							i--;
							break
						}
						var curr = func.substr(i + pre, size);
						parts.push(curr);
						subs.push(curr);
						i += pre + size
					}
					i++;
					return parts
				}
				function parse(rawList, limit, allowVoid) {
					limit = limit || Infinity;
					var ret = "",
					list = [];
					function flushList() {
						return "(" + list.join(", ") + ")"
					}
					var name;
					if (func[i] === "N") {
						name = parseNested().join("::");
						limit--;
						if (limit === 0)
							return rawList ? [name] : name
					} else {
						if (func[i] === "K" || first && func[i] === "L")
							i++;
						var size = parseInt(func.substr(i));
						if (size) {
							var pre = size.toString().length;
							name = func.substr(i + pre, size);
							i += pre + size
						}
					}
					first = false;
					if (func[i] === "I") {
						i++;
						var iList = parse(true);
						var iRet = parse(true, 1, true);
						ret += iRet[0] + " " + name + "<" + iList.join(", ") + ">"
					} else {
						ret = name
					}
					paramLoop: while (i < func.length && limit-- > 0) {
						var c = func[i++];
						if (c in basicTypes) {
							list.push(basicTypes[c])
						} else {
							switch (c) {
							case "P":
								list.push(parse(true, 1, true)[0] + "*");
								break;
							case "R":
								list.push(parse(true, 1, true)[0] + "&");
								break;
							case "L": {
									i++;
									var end = func.indexOf("E", i);
									var size = end - i;
									list.push(func.substr(i, size));
									i += size + 2;
									break
								};
							case "A": {
									var size = parseInt(func.substr(i));
									i += size.toString().length;
									if (func[i] !== "_")
										throw "?";
									i++;
									list.push(parse(true, 1, true)[0] + " [" + size + "]");
									break
								};
							case "E":
								break paramLoop;
							default:
								ret += "?" + c;
								break paramLoop
							}
						}
					}
					if (!allowVoid && list.length === 1 && list[0] === "void")
						list = [];
					if (rawList) {
						if (ret) {
							list.push(ret + "?")
						}
						return list
					} else {
						return ret + flushList()
					}
				}
				var parsed = func;
				try {
					if (func == "Object._main" || func == "_main") {
						return "main()"
					}
					if (typeof func === "number")
						func = Pointer_stringify(func);
					if (func[0] !== "_")
						return func;
					if (func[1] !== "_")
						return func;
					if (func[2] !== "Z")
						return func;
					switch (func[3]) {
					case "n":
						return "operator new()";
					case "d":
						return "operator delete()"
					}
					parsed = parse()
				} catch (e) {
					parsed += "?"
				}
				if (parsed.indexOf("?") >= 0 && !hasLibcxxabi) {
					Runtime.warnOnce("warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling")
				}
				return parsed
			}
			function demangleAll(text) {
				return text.replace(/__Z[\w\d_]+/g, (function (x) {
						var y = demangle(x);
						return x === y ? x : x + " [" + y + "]"
					}))
			}
			function jsStackTrace() {
				var err = new Error;
				if (!err.stack) {
					try {
						throw new Error(0)
					} catch (e) {
						err = e
					}
					if (!err.stack) {
						return "(no stack trace available)"
					}
				}
				return err.stack.toString()
			}
			function stackTrace() {
				return demangleAll(jsStackTrace())
			}
			Module["stackTrace"] = stackTrace;
			var PAGE_SIZE = 4096;
			function alignMemoryPage(x) {
				if (x % 4096 > 0) {
					x += 4096 - x % 4096
				}
				return x
			}
			var HEAP;
			var HEAP8,
			HEAPU8,
			HEAP16,
			HEAPU16,
			HEAP32,
			HEAPU32,
			HEAPF32,
			HEAPF64;
			var STATIC_BASE = 0,
			STATICTOP = 0,
			staticSealed = false;
			var STACK_BASE = 0,
			STACKTOP = 0,
			STACK_MAX = 0;
			var DYNAMIC_BASE = 0,
			DYNAMICTOP = 0;
			function enlargeMemory() {
				abort("Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.")
			}
			var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
			var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 33554432;
			var totalMemory = 64 * 1024;
			while (totalMemory < TOTAL_MEMORY || totalMemory < 2 * TOTAL_STACK) {
				if (totalMemory < 16 * 1024 * 1024) {
					totalMemory *= 2
				} else {
					totalMemory += 16 * 1024 * 1024
				}
			}
			if (totalMemory !== TOTAL_MEMORY) {
				Module.printErr("increasing TOTAL_MEMORY to " + totalMemory + " to be compliant with the asm.js spec (and given that TOTAL_STACK=" + TOTAL_STACK + ")");
				TOTAL_MEMORY = totalMemory
			}
			assert(typeof Int32Array !== "undefined" && typeof Float64Array !== "undefined" && !!(new Int32Array(1))["subarray"] && !!(new Int32Array(1))["set"], "JS engine does not provide full typed array support");
			var buffer;
			buffer = new ArrayBuffer(TOTAL_MEMORY);
			HEAP8 = new Int8Array(buffer);
			HEAP16 = new Int16Array(buffer);
			HEAP32 = new Int32Array(buffer);
			HEAPU8 = new Uint8Array(buffer);
			HEAPU16 = new Uint16Array(buffer);
			HEAPU32 = new Uint32Array(buffer);
			HEAPF32 = new Float32Array(buffer);
			HEAPF64 = new Float64Array(buffer);
			HEAP32[0] = 255;
			assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, "Typed arrays 2 must be run on a little-endian system");
			Module["HEAP"] = HEAP;
			Module["buffer"] = buffer;
			Module["HEAP8"] = HEAP8;
			Module["HEAP16"] = HEAP16;
			Module["HEAP32"] = HEAP32;
			Module["HEAPU8"] = HEAPU8;
			Module["HEAPU16"] = HEAPU16;
			Module["HEAPU32"] = HEAPU32;
			Module["HEAPF32"] = HEAPF32;
			Module["HEAPF64"] = HEAPF64;
			function callRuntimeCallbacks(callbacks) {
				while (callbacks.length > 0) {
					var callback = callbacks.shift();
					if (typeof callback == "function") {
						callback();
						continue
					}
					var func = callback.func;
					if (typeof func === "number") {
						if (callback.arg === undefined) {
							Runtime.dynCall("v", func)
						} else {
							Runtime.dynCall("vi", func, [callback.arg])
						}
					} else {
						func(callback.arg === undefined ? null : callback.arg)
					}
				}
			}
			var __ATPRERUN__ = [];
			var __ATINIT__ = [];
			var __ATMAIN__ = [];
			var __ATEXIT__ = [];
			var __ATPOSTRUN__ = [];
			var runtimeInitialized = false;
			var runtimeExited = false;
			function preRun() {
				if (Module["preRun"]) {
					if (typeof Module["preRun"] == "function")
						Module["preRun"] = [Module["preRun"]];
					while (Module["preRun"].length) {
						addOnPreRun(Module["preRun"].shift())
					}
				}
				callRuntimeCallbacks(__ATPRERUN__)
			}
			function ensureInitRuntime() {
				if (runtimeInitialized)
					return;
				runtimeInitialized = true;
				callRuntimeCallbacks(__ATINIT__)
			}
			function preMain() {
				callRuntimeCallbacks(__ATMAIN__)
			}
			function exitRuntime() {
				callRuntimeCallbacks(__ATEXIT__);
				runtimeExited = true
			}
			function postRun() {
				if (Module["postRun"]) {
					if (typeof Module["postRun"] == "function")
						Module["postRun"] = [Module["postRun"]];
					while (Module["postRun"].length) {
						addOnPostRun(Module["postRun"].shift())
					}
				}
				callRuntimeCallbacks(__ATPOSTRUN__)
			}
			function addOnPreRun(cb) {
				__ATPRERUN__.unshift(cb)
			}
			Module["addOnPreRun"] = Module.addOnPreRun = addOnPreRun;
			function addOnInit(cb) {
				__ATINIT__.unshift(cb)
			}
			Module["addOnInit"] = Module.addOnInit = addOnInit;
			function addOnPreMain(cb) {
				__ATMAIN__.unshift(cb)
			}
			Module["addOnPreMain"] = Module.addOnPreMain = addOnPreMain;
			function addOnExit(cb) {
				__ATEXIT__.unshift(cb)
			}
			Module["addOnExit"] = Module.addOnExit = addOnExit;
			function addOnPostRun(cb) {
				__ATPOSTRUN__.unshift(cb)
			}
			Module["addOnPostRun"] = Module.addOnPostRun = addOnPostRun;
			function intArrayFromString(stringy, dontAddNull, length) {
				var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
				var u8array = new Array(len);
				var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
				if (dontAddNull)
					u8array.length = numBytesWritten;
				return u8array
			}
			Module["intArrayFromString"] = intArrayFromString;
			function intArrayToString(array) {
				var ret = [];
				for (var i = 0; i < array.length; i++) {
					var chr = array[i];
					if (chr > 255) {
						chr &= 255
					}
					ret.push(String.fromCharCode(chr))
				}
				return ret.join("")
			}
			Module["intArrayToString"] = intArrayToString;
			function writeStringToMemory(string, buffer, dontAddNull) {
				var array = intArrayFromString(string, dontAddNull);
				var i = 0;
				while (i < array.length) {
					var chr = array[i];
					HEAP8[buffer + i >> 0] = chr;
					i = i + 1
				}
			}
			Module["writeStringToMemory"] = writeStringToMemory;
			function writeArrayToMemory(array, buffer) {
				for (var i = 0; i < array.length; i++) {
					HEAP8[buffer++ >> 0] = array[i]
				}
			}
			Module["writeArrayToMemory"] = writeArrayToMemory;
			function writeAsciiToMemory(str, buffer, dontAddNull) {
				for (var i = 0; i < str.length; ++i) {
					HEAP8[buffer++ >> 0] = str.charCodeAt(i)
				}
				if (!dontAddNull)
					HEAP8[buffer >> 0] = 0
			}
			Module["writeAsciiToMemory"] = writeAsciiToMemory;
			function unSign(value, bits, ignore) {
				if (value >= 0) {
					return value
				}
				return bits <= 32 ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value
			}
			function reSign(value, bits, ignore) {
				if (value <= 0) {
					return value
				}
				var half = bits <= 32 ? Math.abs(1 << bits - 1) : Math.pow(2, bits - 1);
				if (value >= half && (bits <= 32 || value > half)) {
					value = -2 * half + value
				}
				return value
			}
			if (!Math["imul"] || Math["imul"](4294967295, 5) !== -5)
				Math["imul"] = function imul(a, b) {
					var ah = a >>> 16;
					var al = a & 65535;
					var bh = b >>> 16;
					var bl = b & 65535;
					return al * bl + (ah * bl + al * bh << 16) | 0
				};
			Math.imul = Math["imul"];
			if (!Math["clz32"])
				Math["clz32"] = (function (x) {
					x = x >>> 0;
					for (var i = 0; i < 32; i++) {
						if (x & 1 << 31 - i)
							return i
					}
					return 32
				});
			Math.clz32 = Math["clz32"];
			var Math_abs = Math.abs;
			var Math_cos = Math.cos;
			var Math_sin = Math.sin;
			var Math_tan = Math.tan;
			var Math_acos = Math.acos;
			var Math_asin = Math.asin;
			var Math_atan = Math.atan;
			var Math_atan2 = Math.atan2;
			var Math_exp = Math.exp;
			var Math_log = Math.log;
			var Math_sqrt = Math.sqrt;
			var Math_ceil = Math.ceil;
			var Math_floor = Math.floor;
			var Math_pow = Math.pow;
			var Math_imul = Math.imul;
			var Math_fround = Math.fround;
			var Math_min = Math.min;
			var Math_clz32 = Math.clz32;
			var runDependencies = 0;
			var runDependencyWatcher = null;
			var dependenciesFulfilled = null;
			function getUniqueRunDependency(id) {
				return id
			}
			function addRunDependency(id) {
				runDependencies++;
				if (Module["monitorRunDependencies"]) {
					Module["monitorRunDependencies"](runDependencies)
				}
			}
			Module["addRunDependency"] = addRunDependency;
			function removeRunDependency(id) {
				runDependencies--;
				if (Module["monitorRunDependencies"]) {
					Module["monitorRunDependencies"](runDependencies)
				}
				if (runDependencies == 0) {
					if (runDependencyWatcher !== null) {
						clearInterval(runDependencyWatcher);
						runDependencyWatcher = null
					}
					if (dependenciesFulfilled) {
						var callback = dependenciesFulfilled;
						dependenciesFulfilled = null;
						callback()
					}
				}
			}
			Module["removeRunDependency"] = removeRunDependency;
			Module["preloadedImages"] = {};
			Module["preloadedAudios"] = {};
			var memoryInitializer = null;
			var ASM_CONSTS = [(function ($0) { {
						if (Module.counted)
							Module.counted($0)
					}
				}), (function () { {
						var a = arguments;
						var $i = 0;
						if (Module.decoded)
							Module.decoded(a[$i++], a[$i++], a[$i++], a[$i++], a[$i++], a[$i++], a[$i++], a[$i++], a[$i++], a[$i++], a[$i++], a[$i++], a[$i++], a[$i++], a[$i++])
					}
				})];
			function _emscripten_asm_const_1(code, a0) {
				return ASM_CONSTS[code](a0) | 0
			}
			function _emscripten_asm_const_15(code, a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14) {
				return ASM_CONSTS[code](a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14) | 0
			}
			STATIC_BASE = 8;
			STATICTOP = STATIC_BASE + 5168;
			__ATINIT__.push();
			allocate([255, 0, 0, 0, 24, 0, 0, 0, 24, 1, 0, 0, 0, 0, 0, 0, 0, 255, 1, 25, 2, 50, 26, 198, 3, 223, 51, 238, 27, 104, 199, 75, 4, 100, 224, 14, 52, 141, 239, 129, 28, 193, 105, 248, 200, 8, 76, 113, 5, 138, 101, 47, 225, 36, 15, 33, 53, 147, 142, 218, 240, 18, 130, 69, 29, 181, 194, 125, 106, 39, 249, 185, 201, 154, 9, 120, 77, 228, 114, 166, 6, 191, 139, 98, 102, 221, 48, 253, 226, 152, 37, 179, 16, 145, 34, 136, 54, 208, 148, 206, 143, 150, 219, 189, 241, 210, 19, 92, 131, 56, 70, 64, 30, 66, 182, 163, 195, 72, 126, 110, 107, 58, 40, 84, 250, 133, 186, 61, 202, 94, 155, 159, 10, 21, 121, 43, 78, 212, 229, 172, 115, 243, 167, 87, 7, 112, 192, 247, 140, 128, 99, 13, 103, 74, 222, 237, 49, 197, 254, 24, 227, 165, 153, 119, 38, 184, 180, 124, 17, 68, 146, 217, 35, 32, 137, 46, 55, 63, 209, 91, 149, 188, 207, 205, 144, 135, 151, 178, 220, 252, 190, 97, 242, 86, 211, 171, 20, 42, 93, 158, 132, 60, 57, 83, 71, 109, 65, 162, 31, 45, 67, 216, 183, 123, 164, 118, 196, 23, 73, 236, 127, 12, 111, 246, 108, 161, 59, 82, 41, 157, 85, 170, 251, 96, 134, 177, 187, 204, 62, 90, 203, 89, 95, 176, 156, 169, 160, 81, 11, 245, 22, 235, 122, 117, 44, 215, 79, 174, 213, 233, 230, 231, 173, 232, 116, 214, 244, 234, 168, 80, 88, 175, 1, 2, 4, 8, 16, 32, 64, 128, 29, 58, 116, 232, 205, 135, 19, 38, 76, 152, 45, 90, 180, 117, 234, 201, 143, 3, 6, 12, 24, 48, 96, 192, 157, 39, 78, 156, 37, 74, 148, 53, 106, 212, 181, 119, 238, 193, 159, 35, 70, 140, 5, 10, 20, 40, 80, 160, 93, 186, 105, 210, 185, 111, 222, 161, 95, 190, 97, 194, 153, 47, 94, 188, 101, 202, 137, 15, 30, 60, 120, 240, 253, 231, 211, 187, 107, 214, 177, 127, 254, 225, 223, 163, 91, 182, 113, 226, 217, 175, 67, 134, 17, 34, 68, 136, 13, 26, 52, 104, 208, 189, 103, 206, 129, 31, 62, 124, 248, 237, 199, 147, 59, 118, 236, 197, 151, 51, 102, 204, 133, 23, 46, 92, 184, 109, 218, 169, 79, 158, 33, 66, 132, 21, 42, 84, 168, 77, 154, 41, 82, 164, 85, 170, 73, 146, 57, 114, 228, 213, 183, 115, 230, 209, 191, 99, 198, 145, 63, 126, 252, 229, 215, 179, 123, 246, 241, 255, 227, 219, 171, 75, 150, 49, 98, 196, 149, 55, 110, 220, 165, 87, 174, 65, 130, 25, 50, 100, 200, 141, 7, 14, 28, 56, 112, 224, 221, 167, 83, 166, 81, 162, 89, 178, 121, 242, 249, 239, 195, 155, 43, 86, 172, 69, 138, 9, 18, 36, 72, 144, 61, 122, 244, 245, 247, 243, 251, 235, 203, 139, 11, 22, 44, 88, 176, 125, 250, 233, 207, 131, 27, 54, 108, 216, 173, 71, 142, 1, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 32, 36, 37, 42, 43, 45, 46, 47, 58, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 7, 0, 0, 0, 5, 0, 0, 0, 4, 0, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 7, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 232, 2, 0, 0, 216, 2, 0, 0, 0, 0, 0, 0, 1, 2, 4, 8, 3, 6, 12, 11, 5, 10, 7, 14, 15, 13, 9, 1, 0, 15, 1, 4, 2, 8, 5, 10, 3, 14, 9, 7, 6, 13, 11, 12, 1, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0, 1, 0, 0, 0, 51, 51, 51, 51, 51, 51, 211, 63, 0, 0, 0, 0, 0, 0, 224, 63, 102, 102, 102, 102, 102, 102, 230, 63, 120, 3, 0, 0, 128, 3, 0, 0, 152, 3, 0, 0, 168, 3, 0, 0, 192, 3, 0, 0, 208, 3, 0, 0, 232, 3, 0, 0, 248, 3, 0, 0, 85, 110, 107, 110, 111, 119, 110, 32, 101, 114, 114, 111, 114, 0, 0, 0, 83, 117, 99, 99, 101, 115, 115, 0, 73, 110, 118, 97, 108, 105, 100, 32, 103, 114, 105, 100, 32, 115, 105, 122, 101, 0, 0, 0, 0, 0, 0, 0, 73, 110, 118, 97, 108, 105, 100, 32, 118, 101, 114, 115, 105, 111, 110, 0, 70, 111, 114, 109, 97, 116, 32, 100, 97, 116, 97, 32, 69, 67, 67, 32, 102, 97, 105, 108, 117, 114, 101, 0, 69, 67, 67, 32, 102, 97, 105, 108, 117, 114, 101, 0, 0, 0, 0, 0, 85, 110, 107, 110, 111, 119, 110, 32, 100, 97, 116, 97, 32, 116, 121, 112, 101, 0, 0, 0, 0, 0, 0, 0, 68, 97, 116, 97, 32, 111, 118, 101, 114, 102, 108, 111, 119, 0, 0, 0, 68, 97, 116, 97, 32, 117, 110, 100, 101, 114, 102, 108, 111, 119, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 16, 0, 0, 0, 4, 0, 0, 0, 26, 0, 0, 0, 19, 0, 0, 0, 2, 0, 0, 0, 26, 0, 0, 0, 9, 0, 0, 0, 8, 0, 0, 0, 26, 0, 0, 0, 13, 0, 0, 0, 6, 0, 0, 0, 44, 0, 0, 0, 6, 0, 0, 0, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 0, 0, 0, 28, 0, 0, 0, 8, 0, 0, 0, 44, 0, 0, 0, 34, 0, 0, 0, 4, 0, 0, 0, 44, 0, 0, 0, 16, 0, 0, 0, 14, 0, 0, 0, 44, 0, 0, 0, 22, 0, 0, 0, 11, 0, 0, 0, 70, 0, 0, 0, 6, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 70, 0, 0, 0, 44, 0, 0, 0, 13, 0, 0, 0, 70, 0, 0, 0, 55, 0, 0, 0, 7, 0, 0, 0, 35, 0, 0, 0, 13, 0, 0, 0, 11, 0, 0, 0, 35, 0, 0, 0, 17, 0, 0, 0, 9, 0, 0, 0, 100, 0, 0, 0, 6, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 0, 0, 0, 32, 0, 0, 0, 9, 0, 0, 0, 100, 0, 0, 0, 80, 0, 0, 0, 10, 0, 0, 0, 25, 0, 0, 0, 9, 0, 0, 0, 8, 0, 0, 0, 50, 0, 0, 0, 24, 0, 0, 0, 13, 0, 0, 0, 134, 0, 0, 0, 6, 0, 0, 0, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 67, 0, 0, 0, 43, 0, 0, 0, 12, 0, 0, 0, 134, 0, 0, 0, 108, 0, 0, 0, 13, 0, 0, 0, 33, 0, 0, 0, 11, 0, 0, 0, 11, 0, 0, 0, 33, 0, 0, 0, 15, 0, 0, 0, 9, 0, 0, 0, 172, 0, 0, 0, 6, 0, 0, 0, 34, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 27, 0, 0, 0, 8, 0, 0, 0, 86, 0, 0, 0, 68, 0, 0, 0, 9, 0, 0, 0, 43, 0, 0, 0, 15, 0, 0, 0, 14, 0, 0, 0, 43, 0, 0, 0, 19, 0, 0, 0, 12, 0, 0, 0, 196, 0, 0, 0, 6, 0, 0, 0, 22, 0, 0, 0, 38, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 49, 0, 0, 0, 31, 0, 0, 0, 9, 0, 0, 0, 98, 0, 0, 0, 78, 0, 0, 0, 10, 0, 0, 0, 39, 0, 0, 0, 13, 0, 0, 0, 13, 0, 0, 0, 32, 0, 0, 0, 14, 0, 0, 0, 9, 0, 0, 0, 242, 0, 0, 0, 6, 0, 0, 0, 24, 0, 0, 0, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 60, 0, 0, 0, 38, 0, 0, 0, 11, 0, 0, 0, 121, 0, 0, 0, 97, 0, 0, 0, 12, 0, 0, 0, 40, 0, 0, 0, 14, 0, 0, 0, 13, 0, 0, 0, 40, 0, 0, 0, 18, 0, 0, 0, 11, 0, 0, 0, 36, 1, 0, 0, 6, 0, 0, 0, 26, 0, 0, 0, 46, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 58, 0, 0, 0, 36, 0, 0, 0, 11, 0, 0, 0, 146, 0, 0, 0, 116, 0, 0, 0, 15, 0, 0, 0, 36, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 36, 0, 0, 0, 16, 0, 0, 0, 10, 0, 0, 0, 90, 1, 0, 0, 6, 0, 0, 0, 28, 0, 0, 0, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69, 0, 0, 0, 43, 0, 0, 0, 13, 0, 0, 0, 86, 0, 0, 0, 68, 0, 0, 0, 9, 0, 0, 0, 43, 0, 0, 0, 15, 0, 0, 0, 14, 0, 0, 0, 43, 0, 0, 0, 19, 0, 0, 0, 12, 0, 0, 0, 148, 1, 0, 0, 6, 0, 0, 0, 30, 0, 0, 0, 54, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 80, 0, 0, 0, 50, 0, 0, 0, 15, 0, 0, 0, 101, 0, 0, 0, 81, 0, 0, 0, 10, 0, 0, 0, 36, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 50, 0, 0, 0, 22, 0, 0, 0, 14, 0, 0, 0, 210, 1, 0, 0, 6, 0, 0, 0, 32, 0, 0, 0, 58, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 58, 0, 0, 0, 36, 0, 0, 0, 11, 0, 0, 0, 116, 0, 0, 0, 92, 0, 0, 0, 12, 0, 0, 0, 42, 0, 0, 0, 14, 0, 0, 0, 14, 0, 0, 0, 46, 0, 0, 0, 20, 0, 0, 0, 14, 0, 0, 0, 20, 2, 0, 0, 6, 0, 0, 0, 34, 0, 0, 0, 62, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 59, 0, 0, 0, 37, 0, 0, 0, 11, 0, 0, 0, 133, 0, 0, 0, 107, 0, 0, 0, 13, 0, 0, 0, 33, 0, 0, 0, 11, 0, 0, 0, 11, 0, 0, 0, 44, 0, 0, 0, 20, 0, 0, 0, 12, 0, 0, 0, 69, 2, 0, 0, 6, 0, 0, 0, 26, 0, 0, 0, 46, 0, 0, 0, 66, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 0, 0, 0, 41, 0, 0, 0, 12, 0, 0, 0, 109, 0, 0, 0, 87, 0, 0, 0, 11, 0, 0, 0, 36, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 143, 2, 0, 0, 6, 0, 0, 0, 26, 0, 0, 0, 48, 0, 0, 0, 70, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 0, 0, 0, 41, 0, 0, 0, 12, 0, 0, 0, 109, 0, 0, 0, 87, 0, 0, 0, 11, 0, 0, 0, 36, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 221, 2, 0, 0, 6, 0, 0, 0, 26, 0, 0, 0, 50, 0, 0, 0, 74, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 73, 0, 0, 0, 45, 0, 0, 0, 14, 0, 0, 0, 122, 0, 0, 0, 98, 0, 0, 0, 12, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 43, 0, 0, 0, 19, 0, 0, 0, 12, 0, 0, 0, 47, 3, 0, 0, 6, 0, 0, 0, 30, 0, 0, 0, 54, 0, 0, 0, 78, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 74, 0, 0, 0, 46, 0, 0, 0, 14, 0, 0, 0, 135, 0, 0, 0, 107, 0, 0, 0, 14, 0, 0, 0, 42, 0, 0, 0, 14, 0, 0, 0, 14, 0, 0, 0, 50, 0, 0, 0, 22, 0, 0, 0, 14, 0, 0, 0, 133, 3, 0, 0, 6, 0, 0, 0, 30, 0, 0, 0, 56, 0, 0, 0, 82, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69, 0, 0, 0, 43, 0, 0, 0, 13, 0, 0, 0, 150, 0, 0, 0, 120, 0, 0, 0, 15, 0, 0, 0, 42, 0, 0, 0, 14, 0, 0, 0, 14, 0, 0, 0, 50, 0, 0, 0, 22, 0, 0, 0, 14, 0, 0, 0, 223, 3, 0, 0, 6, 0, 0, 0, 30, 0, 0, 0, 58, 0, 0, 0, 86, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 70, 0, 0, 0, 44, 0, 0, 0, 13, 0, 0, 0, 141, 0, 0, 0, 113, 0, 0, 0, 14, 0, 0, 0, 39, 0, 0, 0, 13, 0, 0, 0, 13, 0, 0, 0, 47, 0, 0, 0, 21, 0, 0, 0, 13, 0, 0, 0, 61, 4, 0, 0, 6, 0, 0, 0, 34, 0, 0, 0, 62, 0, 0, 0, 90, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 67, 0, 0, 0, 41, 0, 0, 0, 13, 0, 0, 0, 135, 0, 0, 0, 107, 0, 0, 0, 14, 0, 0, 0, 43, 0, 0, 0, 15, 0, 0, 0, 14, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 132, 4, 0, 0, 6, 0, 0, 0, 28, 0, 0, 0, 50, 0, 0, 0, 72, 0, 0, 0, 92, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 68, 0, 0, 0, 42, 0, 0, 0, 13, 0, 0, 0, 144, 0, 0, 0, 116, 0, 0, 0, 14, 0, 0, 0, 46, 0, 0, 0, 16, 0, 0, 0, 15, 0, 0, 0, 50, 0, 0, 0, 22, 0, 0, 0, 14, 0, 0, 0, 234, 4, 0, 0, 6, 0, 0, 0, 26, 0, 0, 0, 50, 0, 0, 0, 74, 0, 0, 0, 98, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 74, 0, 0, 0, 46, 0, 0, 0, 14, 0, 0, 0, 139, 0, 0, 0, 111, 0, 0, 0, 14, 0, 0, 0, 37, 0, 0, 0, 13, 0, 0, 0, 12, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 84, 5, 0, 0, 6, 0, 0, 0, 30, 0, 0, 0, 54, 0, 0, 0, 78, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 75, 0, 0, 0, 47, 0, 0, 0, 14, 0, 0, 0, 151, 0, 0, 0, 121, 0, 0, 0, 15, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 194, 5, 0, 0, 6, 0, 0, 0, 28, 0, 0, 0, 54, 0, 0, 0, 80, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 73, 0, 0, 0, 45, 0, 0, 0, 14, 0, 0, 0, 147, 0, 0, 0, 117, 0, 0, 0, 15, 0, 0, 0, 46, 0, 0, 0, 16, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 52, 6, 0, 0, 6, 0, 0, 0, 32, 0, 0, 0, 58, 0, 0, 0, 84, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 75, 0, 0, 0, 47, 0, 0, 0, 14, 0, 0, 0, 132, 0, 0, 0, 106, 0, 0, 0, 13, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 170, 6, 0, 0, 6, 0, 0, 0, 30, 0, 0, 0, 58, 0, 0, 0, 86, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 74, 0, 0, 0, 46, 0, 0, 0, 14, 0, 0, 0, 142, 0, 0, 0, 114, 0, 0, 0, 14, 0, 0, 0, 46, 0, 0, 0, 16, 0, 0, 0, 15, 0, 0, 0, 50, 0, 0, 0, 22, 0, 0, 0, 14, 0, 0, 0, 36, 7, 0, 0, 6, 0, 0, 0, 34, 0, 0, 0, 62, 0, 0, 0, 90, 0, 0, 0, 118, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 73, 0, 0, 0, 45, 0, 0, 0, 14, 0, 0, 0, 152, 0, 0, 0, 122, 0, 0, 0, 15, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 53, 0, 0, 0, 23, 0, 0, 0, 15, 0, 0, 0, 129, 7, 0, 0, 6, 0, 0, 0, 26, 0, 0, 0, 50, 0, 0, 0, 74, 0, 0, 0, 98, 0, 0, 0, 122, 0, 0, 0, 0, 0, 0, 0, 73, 0, 0, 0, 45, 0, 0, 0, 14, 0, 0, 0, 147, 0, 0, 0, 117, 0, 0, 0, 15, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 3, 8, 0, 0, 6, 0, 0, 0, 30, 0, 0, 0, 54, 0, 0, 0, 78, 0, 0, 0, 102, 0, 0, 0, 126, 0, 0, 0, 0, 0, 0, 0, 73, 0, 0, 0, 45, 0, 0, 0, 14, 0, 0, 0, 146, 0, 0, 0, 116, 0, 0, 0, 15, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 73, 0, 0, 0, 45, 0, 0, 0, 14, 0, 0, 0, 137, 8, 0, 0, 6, 0, 0, 0, 26, 0, 0, 0, 52, 0, 0, 0, 78, 0, 0, 0, 104, 0, 0, 0, 130, 0, 0, 0, 0, 0, 0, 0, 75, 0, 0, 0, 47, 0, 0, 0, 14, 0, 0, 0, 145, 0, 0, 0, 115, 0, 0, 0, 15, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 19, 9, 0, 0, 6, 0, 0, 0, 30, 0, 0, 0, 56, 0, 0, 0, 82, 0, 0, 0, 108, 0, 0, 0, 134, 0, 0, 0, 0, 0, 0, 0, 74, 0, 0, 0, 46, 0, 0, 0, 14, 0, 0, 0, 145, 0, 0, 0, 115, 0, 0, 0, 15, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 161, 9, 0, 0, 6, 0, 0, 0, 34, 0, 0, 0, 60, 0, 0, 0, 86, 0, 0, 0, 112, 0, 0, 0, 138, 0, 0, 0, 0, 0, 0, 0, 74, 0, 0, 0, 46, 0, 0, 0, 14, 0, 0, 0, 145, 0, 0, 0, 115, 0, 0, 0, 15, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 51, 10, 0, 0, 6, 0, 0, 0, 30, 0, 0, 0, 58, 0, 0, 0, 96, 0, 0, 0, 114, 0, 0, 0, 142, 0, 0, 0, 0, 0, 0, 0, 74, 0, 0, 0, 46, 0, 0, 0, 14, 0, 0, 0, 145, 0, 0, 0, 115, 0, 0, 0, 15, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 201, 10, 0, 0, 6, 0, 0, 0, 34, 0, 0, 0, 62, 0, 0, 0, 90, 0, 0, 0, 118, 0, 0, 0, 146, 0, 0, 0, 0, 0, 0, 0, 74, 0, 0, 0, 46, 0, 0, 0, 14, 0, 0, 0, 145, 0, 0, 0, 115, 0, 0, 0, 15, 0, 0, 0, 46, 0, 0, 0, 16, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 60, 11, 0, 0, 6, 0, 0, 0, 30, 0, 0, 0, 54, 0, 0, 0, 78, 0, 0, 0, 102, 0, 0, 0, 126, 0, 0, 0, 150, 0, 0, 0, 75, 0, 0, 0, 47, 0, 0, 0, 14, 0, 0, 0, 151, 0, 0, 0, 121, 0, 0, 0, 15, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 218, 11, 0, 0, 6, 0, 0, 0, 24, 0, 0, 0, 50, 0, 0, 0, 76, 0, 0, 0, 102, 0, 0, 0, 128, 0, 0, 0, 154, 0, 0, 0, 75, 0, 0, 0, 47, 0, 0, 0, 14, 0, 0, 0, 151, 0, 0, 0, 121, 0, 0, 0, 15, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 124, 12, 0, 0, 6, 0, 0, 0, 28, 0, 0, 0, 54, 0, 0, 0, 80, 0, 0, 0, 106, 0, 0, 0, 132, 0, 0, 0, 158, 0, 0, 0, 74, 0, 0, 0, 46, 0, 0, 0, 14, 0, 0, 0, 152, 0, 0, 0, 122, 0, 0, 0, 15, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 34, 13, 0, 0, 6, 0, 0, 0, 32, 0, 0, 0, 58, 0, 0, 0, 84, 0, 0, 0, 110, 0, 0, 0, 136, 0, 0, 0, 162, 0, 0, 0, 74, 0, 0, 0, 46, 0, 0, 0, 14, 0, 0, 0, 152, 0, 0, 0, 122, 0, 0, 0, 15, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 204, 13, 0, 0, 6, 0, 0, 0, 26, 0, 0, 0, 54, 0, 0, 0, 82, 0, 0, 0, 110, 0, 0, 0, 138, 0, 0, 0, 166, 0, 0, 0, 75, 0, 0, 0, 47, 0, 0, 0, 14, 0, 0, 0, 147, 0, 0, 0, 117, 0, 0, 0, 15, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 122, 14, 0, 0, 6, 0, 0, 0, 30, 0, 0, 0, 58, 0, 0, 0, 86, 0, 0, 0, 114, 0, 0, 0, 142, 0, 0, 0, 170, 0, 0, 0, 75, 0, 0, 0, 47, 0, 0, 0, 14, 0, 0, 0, 148, 0, 0, 0, 118, 0, 0, 0, 15, 0, 0, 0, 45, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 54, 0, 0, 0, 24, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 70, 97, 105, 108, 101, 100, 32, 116, 111, 32, 97, 108, 108, 111, 99, 97, 116, 101, 32, 109, 101, 109, 111, 114, 121, 0, 0, 0, 0, 0, 0, 0, 70, 97, 105, 108, 101, 100, 32, 116, 111, 32, 97, 108, 108, 111, 99, 97, 116, 101, 32, 118, 105, 100, 101, 111, 32, 109, 101, 109, 111, 114, 121, 0, 123, 32, 105, 102, 32, 40, 119, 105, 110, 100, 111, 119, 46, 99, 111, 117, 110, 116, 101, 100, 41, 32, 99, 111, 117, 110, 116, 101, 100, 40, 36, 48, 41, 59, 32, 125, 0, 0, 0, 0, 68, 69, 67, 79, 68, 69, 32, 70, 65, 73, 76, 69, 68, 58, 32, 37, 115, 10, 0, 0, 0, 0, 0, 0, 123, 32, 118, 97, 114, 32, 97, 32, 61, 32, 97, 114, 103, 117, 109, 101, 110, 116, 115, 59, 32, 118, 97, 114, 32, 36, 105, 32, 61, 32, 48, 59, 32, 105, 102, 32, 40, 119, 105, 110, 100, 111, 119, 46, 100, 101, 99, 111, 100, 101, 100, 41, 32, 100, 101, 99, 111, 100, 101, 100, 40, 32, 97, 91, 36, 105, 43, 43, 93, 44, 32, 97, 91, 36, 105, 43, 43, 93, 44, 32, 97, 91, 36, 105, 43, 43, 93, 44, 32, 97, 91, 36, 105, 43, 43, 93, 44, 32, 97, 91, 36, 105, 43, 43, 93, 44, 32, 97, 91, 36, 105, 43, 43, 93, 44, 32, 97, 91, 36, 105, 43, 43, 93, 44, 32, 97, 91, 36, 105, 43, 43, 93, 44, 32, 97, 91, 36, 105, 43, 43, 93, 44, 32, 97, 91, 36, 105, 43, 43, 93, 44, 32, 97, 91, 36, 105, 43, 43, 93, 44, 32, 97, 91, 36, 105, 43, 43, 93, 44, 32, 97, 91, 36, 105, 43, 43, 93, 44, 32, 97, 91, 36, 105, 43, 43, 93, 44, 32, 97, 91, 36, 105, 43, 43, 93, 32, 41, 59, 32, 125, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
			var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
			assert(tempDoublePtr % 8 == 0);
			function copyTempFloat(ptr) {
				HEAP8[tempDoublePtr] = HEAP8[ptr];
				HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
				HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
				HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3]
			}
			function copyTempDouble(ptr) {
				HEAP8[tempDoublePtr] = HEAP8[ptr];
				HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
				HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
				HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3];
				HEAP8[tempDoublePtr + 4] = HEAP8[ptr + 4];
				HEAP8[tempDoublePtr + 5] = HEAP8[ptr + 5];
				HEAP8[tempDoublePtr + 6] = HEAP8[ptr + 6];
				HEAP8[tempDoublePtr + 7] = HEAP8[ptr + 7]
			}
			Module["_memset"] = _memset;
			var ___errno_state = 0;
			function ___setErrNo(value) {
				HEAP32[___errno_state >> 2] = value;
				return value
			}
			var ERRNO_CODES = {
				EPERM: 1,
				ENOENT: 2,
				ESRCH: 3,
				EINTR: 4,
				EIO: 5,
				ENXIO: 6,
				E2BIG: 7,
				ENOEXEC: 8,
				EBADF: 9,
				ECHILD: 10,
				EAGAIN: 11,
				EWOULDBLOCK: 11,
				ENOMEM: 12,
				EACCES: 13,
				EFAULT: 14,
				ENOTBLK: 15,
				EBUSY: 16,
				EEXIST: 17,
				EXDEV: 18,
				ENODEV: 19,
				ENOTDIR: 20,
				EISDIR: 21,
				EINVAL: 22,
				ENFILE: 23,
				EMFILE: 24,
				ENOTTY: 25,
				ETXTBSY: 26,
				EFBIG: 27,
				ENOSPC: 28,
				ESPIPE: 29,
				EROFS: 30,
				EMLINK: 31,
				EPIPE: 32,
				EDOM: 33,
				ERANGE: 34,
				ENOMSG: 42,
				EIDRM: 43,
				ECHRNG: 44,
				EL2NSYNC: 45,
				EL3HLT: 46,
				EL3RST: 47,
				ELNRNG: 48,
				EUNATCH: 49,
				ENOCSI: 50,
				EL2HLT: 51,
				EDEADLK: 35,
				ENOLCK: 37,
				EBADE: 52,
				EBADR: 53,
				EXFULL: 54,
				ENOANO: 55,
				EBADRQC: 56,
				EBADSLT: 57,
				EDEADLOCK: 35,
				EBFONT: 59,
				ENOSTR: 60,
				ENODATA: 61,
				ETIME: 62,
				ENOSR: 63,
				ENONET: 64,
				ENOPKG: 65,
				EREMOTE: 66,
				ENOLINK: 67,
				EADV: 68,
				ESRMNT: 69,
				ECOMM: 70,
				EPROTO: 71,
				EMULTIHOP: 72,
				EDOTDOT: 73,
				EBADMSG: 74,
				ENOTUNIQ: 76,
				EBADFD: 77,
				EREMCHG: 78,
				ELIBACC: 79,
				ELIBBAD: 80,
				ELIBSCN: 81,
				ELIBMAX: 82,
				ELIBEXEC: 83,
				ENOSYS: 38,
				ENOTEMPTY: 39,
				ENAMETOOLONG: 36,
				ELOOP: 40,
				EOPNOTSUPP: 95,
				EPFNOSUPPORT: 96,
				ECONNRESET: 104,
				ENOBUFS: 105,
				EAFNOSUPPORT: 97,
				EPROTOTYPE: 91,
				ENOTSOCK: 88,
				ENOPROTOOPT: 92,
				ESHUTDOWN: 108,
				ECONNREFUSED: 111,
				EADDRINUSE: 98,
				ECONNABORTED: 103,
				ENETUNREACH: 101,
				ENETDOWN: 100,
				ETIMEDOUT: 110,
				EHOSTDOWN: 112,
				EHOSTUNREACH: 113,
				EINPROGRESS: 115,
				EALREADY: 114,
				EDESTADDRREQ: 89,
				EMSGSIZE: 90,
				EPROTONOSUPPORT: 93,
				ESOCKTNOSUPPORT: 94,
				EADDRNOTAVAIL: 99,
				ENETRESET: 102,
				EISCONN: 106,
				ENOTCONN: 107,
				ETOOMANYREFS: 109,
				EUSERS: 87,
				EDQUOT: 122,
				ESTALE: 116,
				ENOTSUP: 95,
				ENOMEDIUM: 123,
				EILSEQ: 84,
				EOVERFLOW: 75,
				ECANCELED: 125,
				ENOTRECOVERABLE: 131,
				EOWNERDEAD: 130,
				ESTRPIPE: 86
			};
			function _sysconf(name) {
				switch (name) {
				case 30:
					return PAGE_SIZE;
				case 85:
					return totalMemory / PAGE_SIZE;
				case 132:
				case 133:
				case 12:
				case 137:
				case 138:
				case 15:
				case 235:
				case 16:
				case 17:
				case 18:
				case 19:
				case 20:
				case 149:
				case 13:
				case 10:
				case 236:
				case 153:
				case 9:
				case 21:
				case 22:
				case 159:
				case 154:
				case 14:
				case 77:
				case 78:
				case 139:
				case 80:
				case 81:
				case 82:
				case 68:
				case 67:
				case 164:
				case 11:
				case 29:
				case 47:
				case 48:
				case 95:
				case 52:
				case 51:
				case 46:
					return 200809;
				case 79:
					return 0;
				case 27:
				case 246:
				case 127:
				case 128:
				case 23:
				case 24:
				case 160:
				case 161:
				case 181:
				case 182:
				case 242:
				case 183:
				case 184:
				case 243:
				case 244:
				case 245:
				case 165:
				case 178:
				case 179:
				case 49:
				case 50:
				case 168:
				case 169:
				case 175:
				case 170:
				case 171:
				case 172:
				case 97:
				case 76:
				case 32:
				case 173:
				case 35:
					return -1;
				case 176:
				case 177:
				case 7:
				case 155:
				case 8:
				case 157:
				case 125:
				case 126:
				case 92:
				case 93:
				case 129:
				case 130:
				case 131:
				case 94:
				case 91:
					return 1;
				case 74:
				case 60:
				case 69:
				case 70:
				case 4:
					return 1024;
				case 31:
				case 42:
				case 72:
					return 32;
				case 87:
				case 26:
				case 33:
					return 2147483647;
				case 34:
				case 1:
					return 47839;
				case 38:
				case 36:
					return 99;
				case 43:
				case 37:
					return 2048;
				case 0:
					return 2097152;
				case 3:
					return 65536;
				case 28:
					return 32768;
				case 44:
					return 32767;
				case 75:
					return 16384;
				case 39:
					return 1e3;
				case 89:
					return 700;
				case 71:
					return 256;
				case 40:
					return 255;
				case 2:
					return 100;
				case 180:
					return 64;
				case 25:
					return 20;
				case 5:
					return 16;
				case 6:
					return 6;
				case 73:
					return 4;
				case 84: {
						if (typeof navigator === "object")
							return navigator["hardwareConcurrency"] || 1;
						return 1
					}
				}
				___setErrNo(ERRNO_CODES.EINVAL);
				return -1
			}
			var _BDtoIHigh = true;
			var _BDtoILow = true;
			function _abort() {
				Module["abort"]()
			}
			var ERRNO_MESSAGES = {
				0: "Success",
				1: "Not super-user",
				2: "No such file or directory",
				3: "No such process",
				4: "Interrupted system call",
				5: "I/O error",
				6: "No such device or address",
				7: "Arg list too long",
				8: "Exec format error",
				9: "Bad file number",
				10: "No children",
				11: "No more processes",
				12: "Not enough core",
				13: "Permission denied",
				14: "Bad address",
				15: "Block device required",
				16: "Mount device busy",
				17: "File exists",
				18: "Cross-device link",
				19: "No such device",
				20: "Not a directory",
				21: "Is a directory",
				22: "Invalid argument",
				23: "Too many open files in system",
				24: "Too many open files",
				25: "Not a typewriter",
				26: "Text file busy",
				27: "File too large",
				28: "No space left on device",
				29: "Illegal seek",
				30: "Read only file system",
				31: "Too many links",
				32: "Broken pipe",
				33: "Math arg out of domain of func",
				34: "Math result not representable",
				35: "File locking deadlock error",
				36: "File or path name too long",
				37: "No record locks available",
				38: "Function not implemented",
				39: "Directory not empty",
				40: "Too many symbolic links",
				42: "No message of desired type",
				43: "Identifier removed",
				44: "Channel number out of range",
				45: "Level 2 not synchronized",
				46: "Level 3 halted",
				47: "Level 3 reset",
				48: "Link number out of range",
				49: "Protocol driver not attached",
				50: "No CSI structure available",
				51: "Level 2 halted",
				52: "Invalid exchange",
				53: "Invalid request descriptor",
				54: "Exchange full",
				55: "No anode",
				56: "Invalid request code",
				57: "Invalid slot",
				59: "Bad font file fmt",
				60: "Device not a stream",
				61: "No data (for no delay io)",
				62: "Timer expired",
				63: "Out of streams resources",
				64: "Machine is not on the network",
				65: "Package not installed",
				66: "The object is remote",
				67: "The link has been severed",
				68: "Advertise error",
				69: "Srmount error",
				70: "Communication error on send",
				71: "Protocol error",
				72: "Multihop attempted",
				73: "Cross mount point (not really error)",
				74: "Trying to read unreadable message",
				75: "Value too large for defined data type",
				76: "Given log. name not unique",
				77: "f.d. invalid for this operation",
				78: "Remote address changed",
				79: "Can   access a needed shared lib",
				80: "Accessing a corrupted shared lib",
				81: ".lib section in a.out corrupted",
				82: "Attempting to link in too many libs",
				83: "Attempting to exec a shared library",
				84: "Illegal byte sequence",
				86: "Streams pipe error",
				87: "Too many users",
				88: "Socket operation on non-socket",
				89: "Destination address required",
				90: "Message too long",
				91: "Protocol wrong type for socket",
				92: "Protocol not available",
				93: "Unknown protocol",
				94: "Socket type not supported",
				95: "Not supported",
				96: "Protocol family not supported",
				97: "Address family not supported by protocol family",
				98: "Address already in use",
				99: "Address not available",
				100: "Network interface is not configured",
				101: "Network is unreachable",
				102: "Connection reset by network",
				103: "Connection aborted",
				104: "Connection reset by peer",
				105: "No buffer space available",
				106: "Socket is already connected",
				107: "Socket is not connected",
				108: "Can't send after socket shutdown",
				109: "Too many references",
				110: "Connection timed out",
				111: "Connection refused",
				112: "Host is down",
				113: "Host is unreachable",
				114: "Socket already connected",
				115: "Connection already in progress",
				116: "Stale file handle",
				122: "Quota exceeded",
				123: "No medium (in tape drive)",
				125: "Operation canceled",
				130: "Previous owner died",
				131: "State not recoverable"
			};
			var PATH = {
				splitPath: (function (filename) {
					var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
					return splitPathRe.exec(filename).slice(1)
				}),
				normalizeArray: (function (parts, allowAboveRoot) {
					var up = 0;
					for (var i = parts.length - 1; i >= 0; i--) {
						var last = parts[i];
						if (last === ".") {
							parts.splice(i, 1)
						} else if (last === "..") {
							parts.splice(i, 1);
							up++
						} else if (up) {
							parts.splice(i, 1);
							up--
						}
					}
					if (allowAboveRoot) {
						for (; up--; up) {
							parts.unshift("..")
						}
					}
					return parts
				}),
				normalize: (function (path) {
					var isAbsolute = path.charAt(0) === "/",
					trailingSlash = path.substr(-1) === "/";
					path = PATH.normalizeArray(path.split("/").filter((function (p) {
									return !!p
								})), !isAbsolute).join("/");
					if (!path && !isAbsolute) {
						path = "."
					}
					if (path && trailingSlash) {
						path += "/"
					}
					return (isAbsolute ? "/" : "") + path
				}),
				dirname: (function (path) {
					var result = PATH.splitPath(path),
					root = result[0],
					dir = result[1];
					if (!root && !dir) {
						return "."
					}
					if (dir) {
						dir = dir.substr(0, dir.length - 1)
					}
					return root + dir
				}),
				basename: (function (path) {
					if (path === "/")
						return "/";
					var lastSlash = path.lastIndexOf("/");
					if (lastSlash === -1)
						return path;
					return path.substr(lastSlash + 1)
				}),
				extname: (function (path) {
					return PATH.splitPath(path)[3]
				}),
				join: (function () {
					var paths = Array.prototype.slice.call(arguments, 0);
					return PATH.normalize(paths.join("/"))
				}),
				join2: (function (l, r) {
					return PATH.normalize(l + "/" + r)
				}),
				resolve: (function () {
					var resolvedPath = "",
					resolvedAbsolute = false;
					for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
						var path = i >= 0 ? arguments[i] : FS.cwd();
						if (typeof path !== "string") {
							throw new TypeError("Arguments to path.resolve must be strings")
						} else if (!path) {
							return ""
						}
						resolvedPath = path + "/" + resolvedPath;
						resolvedAbsolute = path.charAt(0) === "/"
					}
					resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((function (p) {
									return !!p
								})), !resolvedAbsolute).join("/");
					return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
				}),
				relative: (function (from, to) {
					from = PATH.resolve(from).substr(1);
					to = PATH.resolve(to).substr(1);
					function trim(arr) {
						var start = 0;
						for (; start < arr.length; start++) {
							if (arr[start] !== "")
								break
						}
						var end = arr.length - 1;
						for (; end >= 0; end--) {
							if (arr[end] !== "")
								break
						}
						if (start > end)
							return [];
						return arr.slice(start, end - start + 1)
					}
					var fromParts = trim(from.split("/"));
					var toParts = trim(to.split("/"));
					var length = Math.min(fromParts.length, toParts.length);
					var samePartsLength = length;
					for (var i = 0; i < length; i++) {
						if (fromParts[i] !== toParts[i]) {
							samePartsLength = i;
							break
						}
					}
					var outputParts = [];
					for (var i = samePartsLength; i < fromParts.length; i++) {
						outputParts.push("..")
					}
					outputParts = outputParts.concat(toParts.slice(samePartsLength));
					return outputParts.join("/")
				})
			};
			var TTY = {
				ttys: [],
				init: (function () {}),
				shutdown: (function () {}),
				register: (function (dev, ops) {
					TTY.ttys[dev] = {
						input: [],
						output: [],
						ops: ops
					};
					FS.registerDevice(dev, TTY.stream_ops)
				}),
				stream_ops: {
					open: (function (stream) {
						var tty = TTY.ttys[stream.node.rdev];
						if (!tty) {
							throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
						}
						stream.tty = tty;
						stream.seekable = false
					}),
					close: (function (stream) {
						stream.tty.ops.flush(stream.tty)
					}),
					flush: (function (stream) {
						stream.tty.ops.flush(stream.tty)
					}),
					read: (function (stream, buffer, offset, length, pos) {
						if (!stream.tty || !stream.tty.ops.get_char) {
							throw new FS.ErrnoError(ERRNO_CODES.ENXIO)
						}
						var bytesRead = 0;
						for (var i = 0; i < length; i++) {
							var result;
							try {
								result = stream.tty.ops.get_char(stream.tty)
							} catch (e) {
								throw new FS.ErrnoError(ERRNO_CODES.EIO)
							}
							if (result === undefined && bytesRead === 0) {
								throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
							}
							if (result === null || result === undefined)
								break;
							bytesRead++;
							buffer[offset + i] = result
						}
						if (bytesRead) {
							stream.node.timestamp = Date.now()
						}
						return bytesRead
					}),
					write: (function (stream, buffer, offset, length, pos) {
						if (!stream.tty || !stream.tty.ops.put_char) {
							throw new FS.ErrnoError(ERRNO_CODES.ENXIO)
						}
						for (var i = 0; i < length; i++) {
							try {
								stream.tty.ops.put_char(stream.tty, buffer[offset + i])
							} catch (e) {
								throw new FS.ErrnoError(ERRNO_CODES.EIO)
							}
						}
						if (length) {
							stream.node.timestamp = Date.now()
						}
						return i
					})
				},
				default_tty_ops: {
					get_char: (function (tty) {
						if (!tty.input.length) {
							var result = null;
							if (ENVIRONMENT_IS_NODE) {
								var BUFSIZE = 256;
								var buf = new Buffer(BUFSIZE);
								var bytesRead = 0;
								var fd = process.stdin.fd;
								var usingDevice = false;
								try {
									fd = fs.openSync("/dev/stdin", "r");
									usingDevice = true
								} catch (e) {}
								bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
								if (usingDevice) {
									fs.closeSync(fd)
								}
								if (bytesRead > 0) {
									result = buf.slice(0, bytesRead).toString("utf-8")
								} else {
									result = null
								}
							} else if (typeof window != "undefined" && typeof window.prompt == "function") {
								result = window.prompt("Input: ");
								if (result !== null) {
									result += "\n"
								}
							} else if (typeof readline == "function") {
								result = readline();
								if (result !== null) {
									result += "\n"
								}
							}
							if (!result) {
								return null
							}
							tty.input = intArrayFromString(result, true)
						}
						return tty.input.shift()
					}),
					put_char: (function (tty, val) {
						if (val === null || val === 10) {
							Module["print"](UTF8ArrayToString(tty.output, 0));
							tty.output = []
						} else {
							if (val != 0)
								tty.output.push(val)
						}
					}),
					flush: (function (tty) {
						if (tty.output && tty.output.length > 0) {
							Module["print"](UTF8ArrayToString(tty.output, 0));
							tty.output = []
						}
					})
				},
				default_tty1_ops: {
					put_char: (function (tty, val) {
						if (val === null || val === 10) {
							Module["printErr"](UTF8ArrayToString(tty.output, 0));
							tty.output = []
						} else {
							if (val != 0)
								tty.output.push(val)
						}
					}),
					flush: (function (tty) {
						if (tty.output && tty.output.length > 0) {
							Module["printErr"](UTF8ArrayToString(tty.output, 0));
							tty.output = []
						}
					})
				}
			};
			var MEMFS = {
				ops_table: null,
				mount: (function (mount) {
					return MEMFS.createNode(null, "/", 16384 | 511, 0)
				}),
				createNode: (function (parent, name, mode, dev) {
					if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
						throw new FS.ErrnoError(ERRNO_CODES.EPERM)
					}
					if (!MEMFS.ops_table) {
						MEMFS.ops_table = {
							dir: {
								node: {
									getattr: MEMFS.node_ops.getattr,
									setattr: MEMFS.node_ops.setattr,
									lookup: MEMFS.node_ops.lookup,
									mknod: MEMFS.node_ops.mknod,
									rename: MEMFS.node_ops.rename,
									unlink: MEMFS.node_ops.unlink,
									rmdir: MEMFS.node_ops.rmdir,
									readdir: MEMFS.node_ops.readdir,
									symlink: MEMFS.node_ops.symlink
								},
								stream: {
									llseek: MEMFS.stream_ops.llseek
								}
							},
							file: {
								node: {
									getattr: MEMFS.node_ops.getattr,
									setattr: MEMFS.node_ops.setattr
								},
								stream: {
									llseek: MEMFS.stream_ops.llseek,
									read: MEMFS.stream_ops.read,
									write: MEMFS.stream_ops.write,
									allocate: MEMFS.stream_ops.allocate,
									mmap: MEMFS.stream_ops.mmap,
									msync: MEMFS.stream_ops.msync
								}
							},
							link: {
								node: {
									getattr: MEMFS.node_ops.getattr,
									setattr: MEMFS.node_ops.setattr,
									readlink: MEMFS.node_ops.readlink
								},
								stream: {}
							},
							chrdev: {
								node: {
									getattr: MEMFS.node_ops.getattr,
									setattr: MEMFS.node_ops.setattr
								},
								stream: FS.chrdev_stream_ops
							}
						}
					}
					var node = FS.createNode(parent, name, mode, dev);
					if (FS.isDir(node.mode)) {
						node.node_ops = MEMFS.ops_table.dir.node;
						node.stream_ops = MEMFS.ops_table.dir.stream;
						node.contents = {}
					} else if (FS.isFile(node.mode)) {
						node.node_ops = MEMFS.ops_table.file.node;
						node.stream_ops = MEMFS.ops_table.file.stream;
						node.usedBytes = 0;
						node.contents = null
					} else if (FS.isLink(node.mode)) {
						node.node_ops = MEMFS.ops_table.link.node;
						node.stream_ops = MEMFS.ops_table.link.stream
					} else if (FS.isChrdev(node.mode)) {
						node.node_ops = MEMFS.ops_table.chrdev.node;
						node.stream_ops = MEMFS.ops_table.chrdev.stream
					}
					node.timestamp = Date.now();
					if (parent) {
						parent.contents[name] = node
					}
					return node
				}),
				getFileDataAsRegularArray: (function (node) {
					if (node.contents && node.contents.subarray) {
						var arr = [];
						for (var i = 0; i < node.usedBytes; ++i)
							arr.push(node.contents[i]);
						return arr
					}
					return node.contents
				}),
				getFileDataAsTypedArray: (function (node) {
					if (!node.contents)
						return new Uint8Array;
					if (node.contents.subarray)
						return node.contents.subarray(0, node.usedBytes);
					return new Uint8Array(node.contents)
				}),
				expandFileStorage: (function (node, newCapacity) {
					if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
						node.contents = MEMFS.getFileDataAsRegularArray(node);
						node.usedBytes = node.contents.length
					}
					if (!node.contents || node.contents.subarray) {
						var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
						if (prevCapacity >= newCapacity)
							return;
						var CAPACITY_DOUBLING_MAX = 1024 * 1024;
						newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0);
						if (prevCapacity != 0)
							newCapacity = Math.max(newCapacity, 256);
						var oldContents = node.contents;
						node.contents = new Uint8Array(newCapacity);
						if (node.usedBytes > 0)
							node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
						return
					}
					if (!node.contents && newCapacity > 0)
						node.contents = [];
					while (node.contents.length < newCapacity)
						node.contents.push(0)
				}),
				resizeFileStorage: (function (node, newSize) {
					if (node.usedBytes == newSize)
						return;
					if (newSize == 0) {
						node.contents = null;
						node.usedBytes = 0;
						return
					}
					if (!node.contents || node.contents.subarray) {
						var oldContents = node.contents;
						node.contents = new Uint8Array(new ArrayBuffer(newSize));
						if (oldContents) {
							node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)))
						}
						node.usedBytes = newSize;
						return
					}
					if (!node.contents)
						node.contents = [];
					if (node.contents.length > newSize)
						node.contents.length = newSize;
					else
						while (node.contents.length < newSize)
							node.contents.push(0);
					node.usedBytes = newSize
				}),
				node_ops: {
					getattr: (function (node) {
						var attr = {};
						attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
						attr.ino = node.id;
						attr.mode = node.mode;
						attr.nlink = 1;
						attr.uid = 0;
						attr.gid = 0;
						attr.rdev = node.rdev;
						if (FS.isDir(node.mode)) {
							attr.size = 4096
						} else if (FS.isFile(node.mode)) {
							attr.size = node.usedBytes
						} else if (FS.isLink(node.mode)) {
							attr.size = node.link.length
						} else {
							attr.size = 0
						}
						attr.atime = new Date(node.timestamp);
						attr.mtime = new Date(node.timestamp);
						attr.ctime = new Date(node.timestamp);
						attr.blksize = 4096;
						attr.blocks = Math.ceil(attr.size / attr.blksize);
						return attr
					}),
					setattr: (function (node, attr) {
						if (attr.mode !== undefined) {
							node.mode = attr.mode
						}
						if (attr.timestamp !== undefined) {
							node.timestamp = attr.timestamp
						}
						if (attr.size !== undefined) {
							MEMFS.resizeFileStorage(node, attr.size)
						}
					}),
					lookup: (function (parent, name) {
						throw FS.genericErrors[ERRNO_CODES.ENOENT]
					}),
					mknod: (function (parent, name, mode, dev) {
						return MEMFS.createNode(parent, name, mode, dev)
					}),
					rename: (function (old_node, new_dir, new_name) {
						if (FS.isDir(old_node.mode)) {
							var new_node;
							try {
								new_node = FS.lookupNode(new_dir, new_name)
							} catch (e) {}
							if (new_node) {
								for (var i in new_node.contents) {
									throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
								}
							}
						}
						delete old_node.parent.contents[old_node.name];
						old_node.name = new_name;
						new_dir.contents[new_name] = old_node;
						old_node.parent = new_dir
					}),
					unlink: (function (parent, name) {
						delete parent.contents[name]
					}),
					rmdir: (function (parent, name) {
						var node = FS.lookupNode(parent, name);
						for (var i in node.contents) {
							throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
						}
						delete parent.contents[name]
					}),
					readdir: (function (node) {
						var entries = [".", ".."];
						for (var key in node.contents) {
							if (!node.contents.hasOwnProperty(key)) {
								continue
							}
							entries.push(key)
						}
						return entries
					}),
					symlink: (function (parent, newname, oldpath) {
						var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
						node.link = oldpath;
						return node
					}),
					readlink: (function (node) {
						if (!FS.isLink(node.mode)) {
							throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
						}
						return node.link
					})
				},
				stream_ops: {
					read: (function (stream, buffer, offset, length, position) {
						var contents = stream.node.contents;
						if (position >= stream.node.usedBytes)
							return 0;
						var size = Math.min(stream.node.usedBytes - position, length);
						assert(size >= 0);
						if (size > 8 && contents.subarray) {
							buffer.set(contents.subarray(position, position + size), offset)
						} else {
							for (var i = 0; i < size; i++)
								buffer[offset + i] = contents[position + i]
						}
						return size
					}),
					write: (function (stream, buffer, offset, length, position, canOwn) {
						if (!length)
							return 0;
						var node = stream.node;
						node.timestamp = Date.now();
						if (buffer.subarray && (!node.contents || node.contents.subarray)) {
							if (canOwn) {
								node.contents = buffer.subarray(offset, offset + length);
								node.usedBytes = length;
								return length
							} else if (node.usedBytes === 0 && position === 0) {
								node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
								node.usedBytes = length;
								return length
							} else if (position + length <= node.usedBytes) {
								node.contents.set(buffer.subarray(offset, offset + length), position);
								return length
							}
						}
						MEMFS.expandFileStorage(node, position + length);
						if (node.contents.subarray && buffer.subarray)
							node.contents.set(buffer.subarray(offset, offset + length), position);
						else {
							for (var i = 0; i < length; i++) {
								node.contents[position + i] = buffer[offset + i]
							}
						}
						node.usedBytes = Math.max(node.usedBytes, position + length);
						return length
					}),
					llseek: (function (stream, offset, whence) {
						var position = offset;
						if (whence === 1) {
							position += stream.position
						} else if (whence === 2) {
							if (FS.isFile(stream.node.mode)) {
								position += stream.node.usedBytes
							}
						}
						if (position < 0) {
							throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
						}
						return position
					}),
					allocate: (function (stream, offset, length) {
						MEMFS.expandFileStorage(stream.node, offset + length);
						stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
					}),
					mmap: (function (stream, buffer, offset, length, position, prot, flags) {
						if (!FS.isFile(stream.node.mode)) {
							throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
						}
						var ptr;
						var allocated;
						var contents = stream.node.contents;
						if (!(flags & 2) && (contents.buffer === buffer || contents.buffer === buffer.buffer)) {
							allocated = false;
							ptr = contents.byteOffset
						} else {
							if (position > 0 || position + length < stream.node.usedBytes) {
								if (contents.subarray) {
									contents = contents.subarray(position, position + length)
								} else {
									contents = Array.prototype.slice.call(contents, position, position + length)
								}
							}
							allocated = true;
							ptr = _malloc(length);
							if (!ptr) {
								throw new FS.ErrnoError(ERRNO_CODES.ENOMEM)
							}
							buffer.set(contents, ptr)
						}
						return {
							ptr: ptr,
							allocated: allocated
						}
					}),
					msync: (function (stream, buffer, offset, length, mmapFlags) {
						if (!FS.isFile(stream.node.mode)) {
							throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
						}
						if (mmapFlags & 2) {
							return 0
						}
						var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
						return 0
					})
				}
			};
			var IDBFS = {
				dbs: {},
				indexedDB: (function () {
					if (typeof indexedDB !== "undefined")
						return indexedDB;
					var ret = null;
					if (typeof window === "object")
						ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
					assert(ret, "IDBFS used, but indexedDB not supported");
					return ret
				}),
				DB_VERSION: 21,
				DB_STORE_NAME: "FILE_DATA",
				mount: (function (mount) {
					return MEMFS.mount.apply(null, arguments)
				}),
				syncfs: (function (mount, populate, callback) {
					IDBFS.getLocalSet(mount, (function (err, local) {
							if (err)
								return callback(err);
							IDBFS.getRemoteSet(mount, (function (err, remote) {
									if (err)
										return callback(err);
									var src = populate ? remote : local;
									var dst = populate ? local : remote;
									IDBFS.reconcile(src, dst, callback)
								}))
						}))
				}),
				getDB: (function (name, callback) {
					var db = IDBFS.dbs[name];
					if (db) {
						return callback(null, db)
					}
					var req;
					try {
						req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION)
					} catch (e) {
						return callback(e)
					}
					req.onupgradeneeded = (function (e) {
						var db = e.target.result;
						var transaction = e.target.transaction;
						var fileStore;
						if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
							fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME)
						} else {
							fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME)
						}
						if (!fileStore.indexNames.contains("timestamp")) {
							fileStore.createIndex("timestamp", "timestamp", {
								unique: false
							})
						}
					});
					req.onsuccess = (function () {
						db = req.result;
						IDBFS.dbs[name] = db;
						callback(null, db)
					});
					req.onerror = (function (e) {
						callback(this.error);
						e.preventDefault()
					})
				}),
				getLocalSet: (function (mount, callback) {
					var entries = {};
					function isRealDir(p) {
						return p !== "." && p !== ".."
					}
					function toAbsolute(root) {
						return (function (p) {
							return PATH.join2(root, p)
						})
					}
					var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
					while (check.length) {
						var path = check.pop();
						var stat;
						try {
							stat = FS.stat(path)
						} catch (e) {
							return callback(e)
						}
						if (FS.isDir(stat.mode)) {
							check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))
						}
						entries[path] = {
							timestamp: stat.mtime
						}
					}
					return callback(null, {
						type: "local",
						entries: entries
					})
				}),
				getRemoteSet: (function (mount, callback) {
					var entries = {};
					IDBFS.getDB(mount.mountpoint, (function (err, db) {
							if (err)
								return callback(err);
							var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readonly");
							transaction.onerror = (function (e) {
								callback(this.error);
								e.preventDefault()
							});
							var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
							var index = store.index("timestamp");
							index.openKeyCursor().onsuccess = (function (event) {
								var cursor = event.target.result;
								if (!cursor) {
									return callback(null, {
										type: "remote",
										db: db,
										entries: entries
									})
								}
								entries[cursor.primaryKey] = {
									timestamp: cursor.key
								};
								cursor.continue()
							})
						}))
				}),
				loadLocalEntry: (function (path, callback) {
					var stat,
					node;
					try {
						var lookup = FS.lookupPath(path);
						node = lookup.node;
						stat = FS.stat(path)
					} catch (e) {
						return callback(e)
					}
					if (FS.isDir(stat.mode)) {
						return callback(null, {
							timestamp: stat.mtime,
							mode: stat.mode
						})
					} else if (FS.isFile(stat.mode)) {
						node.contents = MEMFS.getFileDataAsTypedArray(node);
						return callback(null, {
							timestamp: stat.mtime,
							mode: stat.mode,
							contents: node.contents
						})
					} else {
						return callback(new Error("node type not supported"))
					}
				}),
				storeLocalEntry: (function (path, entry, callback) {
					try {
						if (FS.isDir(entry.mode)) {
							FS.mkdir(path, entry.mode)
						} else if (FS.isFile(entry.mode)) {
							FS.writeFile(path, entry.contents, {
								encoding: "binary",
								canOwn: true
							})
						} else {
							return callback(new Error("node type not supported"))
						}
						FS.chmod(path, entry.mode);
						FS.utime(path, entry.timestamp, entry.timestamp)
					} catch (e) {
						return callback(e)
					}
					callback(null)
				}),
				removeLocalEntry: (function (path, callback) {
					try {
						var lookup = FS.lookupPath(path);
						var stat = FS.stat(path);
						if (FS.isDir(stat.mode)) {
							FS.rmdir(path)
						} else if (FS.isFile(stat.mode)) {
							FS.unlink(path)
						}
					} catch (e) {
						return callback(e)
					}
					callback(null)
				}),
				loadRemoteEntry: (function (store, path, callback) {
					var req = store.get(path);
					req.onsuccess = (function (event) {
						callback(null, event.target.result)
					});
					req.onerror = (function (e) {
						callback(this.error);
						e.preventDefault()
					})
				}),
				storeRemoteEntry: (function (store, path, entry, callback) {
					var req = store.put(entry, path);
					req.onsuccess = (function () {
						callback(null)
					});
					req.onerror = (function (e) {
						callback(this.error);
						e.preventDefault()
					})
				}),
				removeRemoteEntry: (function (store, path, callback) {
					var req = store.delete (path);
					req.onsuccess = (function () {
						callback(null)
					});
					req.onerror = (function (e) {
						callback(this.error);
						e.preventDefault()
					})
				}),
				reconcile: (function (src, dst, callback) {
					var total = 0;
					var create = [];
					Object.keys(src.entries).forEach((function (key) {
							var e = src.entries[key];
							var e2 = dst.entries[key];
							if (!e2 || e.timestamp > e2.timestamp) {
								create.push(key);
								total++
							}
						}));
					var remove = [];
					Object.keys(dst.entries).forEach((function (key) {
							var e = dst.entries[key];
							var e2 = src.entries[key];
							if (!e2) {
								remove.push(key);
								total++
							}
						}));
					if (!total) {
						return callback(null)
					}
					var errored = false;
					var completed = 0;
					var db = src.type === "remote" ? src.db : dst.db;
					var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readwrite");
					var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
					function done(err) {
						if (err) {
							if (!done.errored) {
								done.errored = true;
								return callback(err)
							}
							return
						}
						if (++completed >= total) {
							return callback(null)
						}
					}
					transaction.onerror = (function (e) {
						done(this.error);
						e.preventDefault()
					});
					create.sort().forEach((function (path) {
							if (dst.type === "local") {
								IDBFS.loadRemoteEntry(store, path, (function (err, entry) {
										if (err)
											return done(err);
										IDBFS.storeLocalEntry(path, entry, done)
									}))
							} else {
								IDBFS.loadLocalEntry(path, (function (err, entry) {
										if (err)
											return done(err);
										IDBFS.storeRemoteEntry(store, path, entry, done)
									}))
							}
						}));
					remove.sort().reverse().forEach((function (path) {
							if (dst.type === "local") {
								IDBFS.removeLocalEntry(path, done)
							} else {
								IDBFS.removeRemoteEntry(store, path, done)
							}
						}))
				})
			};
			var NODEFS = {
				isWindows: false,
				staticInit: (function () {
					NODEFS.isWindows = !!process.platform.match(/^win/)
				}),
				mount: (function (mount) {
					assert(ENVIRONMENT_IS_NODE);
					return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0)
				}),
				createNode: (function (parent, name, mode, dev) {
					if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
						throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
					}
					var node = FS.createNode(parent, name, mode);
					node.node_ops = NODEFS.node_ops;
					node.stream_ops = NODEFS.stream_ops;
					return node
				}),
				getMode: (function (path) {
					var stat;
					try {
						stat = fs.lstatSync(path);
						if (NODEFS.isWindows) {
							stat.mode = stat.mode | (stat.mode & 146) >> 1
						}
					} catch (e) {
						if (!e.code)
							throw e;
						throw new FS.ErrnoError(ERRNO_CODES[e.code])
					}
					return stat.mode
				}),
				realPath: (function (node) {
					var parts = [];
					while (node.parent !== node) {
						parts.push(node.name);
						node = node.parent
					}
					parts.push(node.mount.opts.root);
					parts.reverse();
					return PATH.join.apply(null, parts)
				}),
				flagsToPermissionStringMap: {
					0: "r",
					1: "r+",
					2: "r+",
					64: "r",
					65: "r+",
					66: "r+",
					129: "rx+",
					193: "rx+",
					514: "w+",
					577: "w",
					578: "w+",
					705: "wx",
					706: "wx+",
					1024: "a",
					1025: "a",
					1026: "a+",
					1089: "a",
					1090: "a+",
					1153: "ax",
					1154: "ax+",
					1217: "ax",
					1218: "ax+",
					4096: "rs",
					4098: "rs+"
				},
				flagsToPermissionString: (function (flags) {
					if (flags in NODEFS.flagsToPermissionStringMap) {
						return NODEFS.flagsToPermissionStringMap[flags]
					} else {
						return flags
					}
				}),
				node_ops: {
					getattr: (function (node) {
						var path = NODEFS.realPath(node);
						var stat;
						try {
							stat = fs.lstatSync(path)
						} catch (e) {
							if (!e.code)
								throw e;
							throw new FS.ErrnoError(ERRNO_CODES[e.code])
						}
						if (NODEFS.isWindows && !stat.blksize) {
							stat.blksize = 4096
						}
						if (NODEFS.isWindows && !stat.blocks) {
							stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0
						}
						return {
							dev: stat.dev,
							ino: stat.ino,
							mode: stat.mode,
							nlink: stat.nlink,
							uid: stat.uid,
							gid: stat.gid,
							rdev: stat.rdev,
							size: stat.size,
							atime: stat.atime,
							mtime: stat.mtime,
							ctime: stat.ctime,
							blksize: stat.blksize,
							blocks: stat.blocks
						}
					}),
					setattr: (function (node, attr) {
						var path = NODEFS.realPath(node);
						try {
							if (attr.mode !== undefined) {
								fs.chmodSync(path, attr.mode);
								node.mode = attr.mode
							}
							if (attr.timestamp !== undefined) {
								var date = new Date(attr.timestamp);
								fs.utimesSync(path, date, date)
							}
							if (attr.size !== undefined) {
								fs.truncateSync(path, attr.size)
							}
						} catch (e) {
							if (!e.code)
								throw e;
							throw new FS.ErrnoError(ERRNO_CODES[e.code])
						}
					}),
					lookup: (function (parent, name) {
						var path = PATH.join2(NODEFS.realPath(parent), name);
						var mode = NODEFS.getMode(path);
						return NODEFS.createNode(parent, name, mode)
					}),
					mknod: (function (parent, name, mode, dev) {
						var node = NODEFS.createNode(parent, name, mode, dev);
						var path = NODEFS.realPath(node);
						try {
							if (FS.isDir(node.mode)) {
								fs.mkdirSync(path, node.mode)
							} else {
								fs.writeFileSync(path, "", {
									mode: node.mode
								})
							}
						} catch (e) {
							if (!e.code)
								throw e;
							throw new FS.ErrnoError(ERRNO_CODES[e.code])
						}
						return node
					}),
					rename: (function (oldNode, newDir, newName) {
						var oldPath = NODEFS.realPath(oldNode);
						var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
						try {
							fs.renameSync(oldPath, newPath)
						} catch (e) {
							if (!e.code)
								throw e;
							throw new FS.ErrnoError(ERRNO_CODES[e.code])
						}
					}),
					unlink: (function (parent, name) {
						var path = PATH.join2(NODEFS.realPath(parent), name);
						try {
							fs.unlinkSync(path)
						} catch (e) {
							if (!e.code)
								throw e;
							throw new FS.ErrnoError(ERRNO_CODES[e.code])
						}
					}),
					rmdir: (function (parent, name) {
						var path = PATH.join2(NODEFS.realPath(parent), name);
						try {
							fs.rmdirSync(path)
						} catch (e) {
							if (!e.code)
								throw e;
							throw new FS.ErrnoError(ERRNO_CODES[e.code])
						}
					}),
					readdir: (function (node) {
						var path = NODEFS.realPath(node);
						try {
							return fs.readdirSync(path)
						} catch (e) {
							if (!e.code)
								throw e;
							throw new FS.ErrnoError(ERRNO_CODES[e.code])
						}
					}),
					symlink: (function (parent, newName, oldPath) {
						var newPath = PATH.join2(NODEFS.realPath(parent), newName);
						try {
							fs.symlinkSync(oldPath, newPath)
						} catch (e) {
							if (!e.code)
								throw e;
							throw new FS.ErrnoError(ERRNO_CODES[e.code])
						}
					}),
					readlink: (function (node) {
						var path = NODEFS.realPath(node);
						try {
							path = fs.readlinkSync(path);
							path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
							return path
						} catch (e) {
							if (!e.code)
								throw e;
							throw new FS.ErrnoError(ERRNO_CODES[e.code])
						}
					})
				},
				stream_ops: {
					open: (function (stream) {
						var path = NODEFS.realPath(stream.node);
						try {
							if (FS.isFile(stream.node.mode)) {
								stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags))
							}
						} catch (e) {
							if (!e.code)
								throw e;
							throw new FS.ErrnoError(ERRNO_CODES[e.code])
						}
					}),
					close: (function (stream) {
						try {
							if (FS.isFile(stream.node.mode) && stream.nfd) {
								fs.closeSync(stream.nfd)
							}
						} catch (e) {
							if (!e.code)
								throw e;
							throw new FS.ErrnoError(ERRNO_CODES[e.code])
						}
					}),
					read: (function (stream, buffer, offset, length, position) {
						if (length === 0)
							return 0;
						var nbuffer = new Buffer(length);
						var res;
						try {
							res = fs.readSync(stream.nfd, nbuffer, 0, length, position)
						} catch (e) {
							throw new FS.ErrnoError(ERRNO_CODES[e.code])
						}
						if (res > 0) {
							for (var i = 0; i < res; i++) {
								buffer[offset + i] = nbuffer[i]
							}
						}
						return res
					}),
					write: (function (stream, buffer, offset, length, position) {
						var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
						var res;
						try {
							res = fs.writeSync(stream.nfd, nbuffer, 0, length, position)
						} catch (e) {
							throw new FS.ErrnoError(ERRNO_CODES[e.code])
						}
						return res
					}),
					llseek: (function (stream, offset, whence) {
						var position = offset;
						if (whence === 1) {
							position += stream.position
						} else if (whence === 2) {
							if (FS.isFile(stream.node.mode)) {
								try {
									var stat = fs.fstatSync(stream.nfd);
									position += stat.size
								} catch (e) {
									throw new FS.ErrnoError(ERRNO_CODES[e.code])
								}
							}
						}
						if (position < 0) {
							throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
						}
						return position
					})
				}
			};
			var _stdin = allocate(1, "i32*", ALLOC_STATIC);
			var _stdout = allocate(1, "i32*", ALLOC_STATIC);
			var _stderr = allocate(1, "i32*", ALLOC_STATIC);
			function _fflush(stream) {}
			var FS = {
				root: null,
				mounts: [],
				devices: [null],
				streams: [],
				nextInode: 1,
				nameTable: null,
				currentPath: "/",
				initialized: false,
				ignorePermissions: true,
				trackingDelegate: {},
				tracking: {
					openFlags: {
						READ: 1,
						WRITE: 2
					}
				},
				ErrnoError: null,
				genericErrors: {},
				handleFSError: (function (e) {
					if (!(e instanceof FS.ErrnoError))
						throw e + " : " + stackTrace();
					return ___setErrNo(e.errno)
				}),
				lookupPath: (function (path, opts) {
					path = PATH.resolve(FS.cwd(), path);
					opts = opts || {};
					if (!path)
						return {
							path: "",
							node: null
						};
					var defaults = {
						follow_mount: true,
						recurse_count: 0
					};
					for (var key in defaults) {
						if (opts[key] === undefined) {
							opts[key] = defaults[key]
						}
					}
					if (opts.recurse_count > 8) {
						throw new FS.ErrnoError(ERRNO_CODES.ELOOP)
					}
					var parts = PATH.normalizeArray(path.split("/").filter((function (p) {
									return !!p
								})), false);
					var current = FS.root;
					var current_path = "/";
					for (var i = 0; i < parts.length; i++) {
						var islast = i === parts.length - 1;
						if (islast && opts.parent) {
							break
						}
						current = FS.lookupNode(current, parts[i]);
						current_path = PATH.join2(current_path, parts[i]);
						if (FS.isMountpoint(current)) {
							if (!islast || islast && opts.follow_mount) {
								current = current.mounted.root
							}
						}
						if (!islast || opts.follow) {
							var count = 0;
							while (FS.isLink(current.mode)) {
								var link = FS.readlink(current_path);
								current_path = PATH.resolve(PATH.dirname(current_path), link);
								var lookup = FS.lookupPath(current_path, {
										recurse_count: opts.recurse_count
									});
								current = lookup.node;
								if (count++ > 40) {
									throw new FS.ErrnoError(ERRNO_CODES.ELOOP)
								}
							}
						}
					}
					return {
						path: current_path,
						node: current
					}
				}),
				getPath: (function (node) {
					var path;
					while (true) {
						if (FS.isRoot(node)) {
							var mount = node.mount.mountpoint;
							if (!path)
								return mount;
							return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path
						}
						path = path ? node.name + "/" + path : node.name;
						node = node.parent
					}
				}),
				hashName: (function (parentid, name) {
					var hash = 0;
					for (var i = 0; i < name.length; i++) {
						hash = (hash << 5) - hash + name.charCodeAt(i) | 0
					}
					return (parentid + hash >>> 0) % FS.nameTable.length
				}),
				hashAddNode: (function (node) {
					var hash = FS.hashName(node.parent.id, node.name);
					node.name_next = FS.nameTable[hash];
					FS.nameTable[hash] = node
				}),
				hashRemoveNode: (function (node) {
					var hash = FS.hashName(node.parent.id, node.name);
					if (FS.nameTable[hash] === node) {
						FS.nameTable[hash] = node.name_next
					} else {
						var current = FS.nameTable[hash];
						while (current) {
							if (current.name_next === node) {
								current.name_next = node.name_next;
								break
							}
							current = current.name_next
						}
					}
				}),
				lookupNode: (function (parent, name) {
					var err = FS.mayLookup(parent);
					if (err) {
						throw new FS.ErrnoError(err, parent)
					}
					var hash = FS.hashName(parent.id, name);
					for (var node = FS.nameTable[hash]; node; node = node.name_next) {
						var nodeName = node.name;
						if (node.parent.id === parent.id && nodeName === name) {
							return node
						}
					}
					return FS.lookup(parent, name)
				}),
				createNode: (function (parent, name, mode, rdev) {
					if (!FS.FSNode) {
						FS.FSNode = (function (parent, name, mode, rdev) {
							if (!parent) {
								parent = this
							}
							this.parent = parent;
							this.mount = parent.mount;
							this.mounted = null;
							this.id = FS.nextInode++;
							this.name = name;
							this.mode = mode;
							this.node_ops = {};
							this.stream_ops = {};
							this.rdev = rdev
						});
						FS.FSNode.prototype = {};
						var readMode = 292 | 73;
						var writeMode = 146;
						Object.defineProperties(FS.FSNode.prototype, {
							read: {
								get: (function () {
									return (this.mode & readMode) === readMode
								}),
								set: (function (val) {
									val ? this.mode |= readMode : this.mode &= ~readMode
								})
							},
							write: {
								get: (function () {
									return (this.mode & writeMode) === writeMode
								}),
								set: (function (val) {
									val ? this.mode |= writeMode : this.mode &= ~writeMode
								})
							},
							isFolder: {
								get: (function () {
									return FS.isDir(this.mode)
								})
							},
							isDevice: {
								get: (function () {
									return FS.isChrdev(this.mode)
								})
							}
						})
					}
					var node = new FS.FSNode(parent, name, mode, rdev);
					FS.hashAddNode(node);
					return node
				}),
				destroyNode: (function (node) {
					FS.hashRemoveNode(node)
				}),
				isRoot: (function (node) {
					return node === node.parent
				}),
				isMountpoint: (function (node) {
					return !!node.mounted
				}),
				isFile: (function (mode) {
					return (mode & 61440) === 32768
				}),
				isDir: (function (mode) {
					return (mode & 61440) === 16384
				}),
				isLink: (function (mode) {
					return (mode & 61440) === 40960
				}),
				isChrdev: (function (mode) {
					return (mode & 61440) === 8192
				}),
				isBlkdev: (function (mode) {
					return (mode & 61440) === 24576
				}),
				isFIFO: (function (mode) {
					return (mode & 61440) === 4096
				}),
				isSocket: (function (mode) {
					return (mode & 49152) === 49152
				}),
				flagModes: {
					"r": 0,
					"rs": 1052672,
					"r+": 2,
					"w": 577,
					"wx": 705,
					"xw": 705,
					"w+": 578,
					"wx+": 706,
					"xw+": 706,
					"a": 1089,
					"ax": 1217,
					"xa": 1217,
					"a+": 1090,
					"ax+": 1218,
					"xa+": 1218
				},
				modeStringToFlags: (function (str) {
					var flags = FS.flagModes[str];
					if (typeof flags === "undefined") {
						throw new Error("Unknown file open mode: " + str)
					}
					return flags
				}),
				flagsToPermissionString: (function (flag) {
					var accmode = flag & 2097155;
					var perms = ["r", "w", "rw"][accmode];
					if (flag & 512) {
						perms += "w"
					}
					return perms
				}),
				nodePermissions: (function (node, perms) {
					if (FS.ignorePermissions) {
						return 0
					}
					if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
						return ERRNO_CODES.EACCES
					} else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
						return ERRNO_CODES.EACCES
					} else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
						return ERRNO_CODES.EACCES
					}
					return 0
				}),
				mayLookup: (function (dir) {
					var err = FS.nodePermissions(dir, "x");
					if (err)
						return err;
					if (!dir.node_ops.lookup)
						return ERRNO_CODES.EACCES;
					return 0
				}),
				mayCreate: (function (dir, name) {
					try {
						var node = FS.lookupNode(dir, name);
						return ERRNO_CODES.EEXIST
					} catch (e) {}
					return FS.nodePermissions(dir, "wx")
				}),
				mayDelete: (function (dir, name, isdir) {
					var node;
					try {
						node = FS.lookupNode(dir, name)
					} catch (e) {
						return e.errno
					}
					var err = FS.nodePermissions(dir, "wx");
					if (err) {
						return err
					}
					if (isdir) {
						if (!FS.isDir(node.mode)) {
							return ERRNO_CODES.ENOTDIR
						}
						if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
							return ERRNO_CODES.EBUSY
						}
					} else {
						if (FS.isDir(node.mode)) {
							return ERRNO_CODES.EISDIR
						}
					}
					return 0
				}),
				mayOpen: (function (node, flags) {
					if (!node) {
						return ERRNO_CODES.ENOENT
					}
					if (FS.isLink(node.mode)) {
						return ERRNO_CODES.ELOOP
					} else if (FS.isDir(node.mode)) {
						if ((flags & 2097155) !== 0 || flags & 512) {
							return ERRNO_CODES.EISDIR
						}
					}
					return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
				}),
				MAX_OPEN_FDS: 4096,
				nextfd: (function (fd_start, fd_end) {
					fd_start = fd_start || 0;
					fd_end = fd_end || FS.MAX_OPEN_FDS;
					for (var fd = fd_start; fd <= fd_end; fd++) {
						if (!FS.streams[fd]) {
							return fd
						}
					}
					throw new FS.ErrnoError(ERRNO_CODES.EMFILE)
				}),
				getStream: (function (fd) {
					return FS.streams[fd]
				}),
				createStream: (function (stream, fd_start, fd_end) {
					if (!FS.FSStream) {
						FS.FSStream = (function () {});
						FS.FSStream.prototype = {};
						Object.defineProperties(FS.FSStream.prototype, {
							object: {
								get: (function () {
									return this.node
								}),
								set: (function (val) {
									this.node = val
								})
							},
							isRead: {
								get: (function () {
									return (this.flags & 2097155) !== 1
								})
							},
							isWrite: {
								get: (function () {
									return (this.flags & 2097155) !== 0
								})
							},
							isAppend: {
								get: (function () {
									return this.flags & 1024
								})
							}
						})
					}
					var newStream = new FS.FSStream;
					for (var p in stream) {
						newStream[p] = stream[p]
					}
					stream = newStream;
					var fd = FS.nextfd(fd_start, fd_end);
					stream.fd = fd;
					FS.streams[fd] = stream;
					return stream
				}),
				closeStream: (function (fd) {
					FS.streams[fd] = null
				}),
				getStreamFromPtr: (function (ptr) {
					return FS.streams[ptr - 1]
				}),
				getPtrForStream: (function (stream) {
					return stream ? stream.fd + 1 : 0
				}),
				chrdev_stream_ops: {
					open: (function (stream) {
						var device = FS.getDevice(stream.node.rdev);
						stream.stream_ops = device.stream_ops;
						if (stream.stream_ops.open) {
							stream.stream_ops.open(stream)
						}
					}),
					llseek: (function () {
						throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
					})
				},
				major: (function (dev) {
					return dev >> 8
				}),
				minor: (function (dev) {
					return dev & 255
				}),
				makedev: (function (ma, mi) {
					return ma << 8 | mi
				}),
				registerDevice: (function (dev, ops) {
					FS.devices[dev] = {
						stream_ops: ops
					}
				}),
				getDevice: (function (dev) {
					return FS.devices[dev]
				}),
				getMounts: (function (mount) {
					var mounts = [];
					var check = [mount];
					while (check.length) {
						var m = check.pop();
						mounts.push(m);
						check.push.apply(check, m.mounts)
					}
					return mounts
				}),
				syncfs: (function (populate, callback) {
					if (typeof populate === "function") {
						callback = populate;
						populate = false
					}
					var mounts = FS.getMounts(FS.root.mount);
					var completed = 0;
					function done(err) {
						if (err) {
							if (!done.errored) {
								done.errored = true;
								return callback(err)
							}
							return
						}
						if (++completed >= mounts.length) {
							callback(null)
						}
					}
					mounts.forEach((function (mount) {
							if (!mount.type.syncfs) {
								return done(null)
							}
							mount.type.syncfs(mount, populate, done)
						}))
				}),
				mount: (function (type, opts, mountpoint) {
					var root = mountpoint === "/";
					var pseudo = !mountpoint;
					var node;
					if (root && FS.root) {
						throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
					} else if (!root && !pseudo) {
						var lookup = FS.lookupPath(mountpoint, {
								follow_mount: false
							});
						mountpoint = lookup.path;
						node = lookup.node;
						if (FS.isMountpoint(node)) {
							throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
						}
						if (!FS.isDir(node.mode)) {
							throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
						}
					}
					var mount = {
						type: type,
						opts: opts,
						mountpoint: mountpoint,
						mounts: []
					};
					var mountRoot = type.mount(mount);
					mountRoot.mount = mount;
					mount.root = mountRoot;
					if (root) {
						FS.root = mountRoot
					} else if (node) {
						node.mounted = mount;
						if (node.mount) {
							node.mount.mounts.push(mount)
						}
					}
					return mountRoot
				}),
				unmount: (function (mountpoint) {
					var lookup = FS.lookupPath(mountpoint, {
							follow_mount: false
						});
					if (!FS.isMountpoint(lookup.node)) {
						throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
					}
					var node = lookup.node;
					var mount = node.mounted;
					var mounts = FS.getMounts(mount);
					Object.keys(FS.nameTable).forEach((function (hash) {
							var current = FS.nameTable[hash];
							while (current) {
								var next = current.name_next;
								if (mounts.indexOf(current.mount) !== -1) {
									FS.destroyNode(current)
								}
								current = next
							}
						}));
					node.mounted = null;
					var idx = node.mount.mounts.indexOf(mount);
					assert(idx !== -1);
					node.mount.mounts.splice(idx, 1)
				}),
				lookup: (function (parent, name) {
					return parent.node_ops.lookup(parent, name)
				}),
				mknod: (function (path, mode, dev) {
					var lookup = FS.lookupPath(path, {
							parent: true
						});
					var parent = lookup.node;
					var name = PATH.basename(path);
					if (!name || name === "." || name === "..") {
						throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
					}
					var err = FS.mayCreate(parent, name);
					if (err) {
						throw new FS.ErrnoError(err)
					}
					if (!parent.node_ops.mknod) {
						throw new FS.ErrnoError(ERRNO_CODES.EPERM)
					}
					return parent.node_ops.mknod(parent, name, mode, dev)
				}),
				create: (function (path, mode) {
					mode = mode !== undefined ? mode : 438;
					mode &= 4095;
					mode |= 32768;
					return FS.mknod(path, mode, 0)
				}),
				mkdir: (function (path, mode) {
					mode = mode !== undefined ? mode : 511;
					mode &= 511 | 512;
					mode |= 16384;
					return FS.mknod(path, mode, 0)
				}),
				mkdev: (function (path, mode, dev) {
					if (typeof dev === "undefined") {
						dev = mode;
						mode = 438
					}
					mode |= 8192;
					return FS.mknod(path, mode, dev)
				}),
				symlink: (function (oldpath, newpath) {
					if (!PATH.resolve(oldpath)) {
						throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
					}
					var lookup = FS.lookupPath(newpath, {
							parent: true
						});
					var parent = lookup.node;
					if (!parent) {
						throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
					}
					var newname = PATH.basename(newpath);
					var err = FS.mayCreate(parent, newname);
					if (err) {
						throw new FS.ErrnoError(err)
					}
					if (!parent.node_ops.symlink) {
						throw new FS.ErrnoError(ERRNO_CODES.EPERM)
					}
					return parent.node_ops.symlink(parent, newname, oldpath)
				}),
				rename: (function (old_path, new_path) {
					var old_dirname = PATH.dirname(old_path);
					var new_dirname = PATH.dirname(new_path);
					var old_name = PATH.basename(old_path);
					var new_name = PATH.basename(new_path);
					var lookup,
					old_dir,
					new_dir;
					try {
						lookup = FS.lookupPath(old_path, {
								parent: true
							});
						old_dir = lookup.node;
						lookup = FS.lookupPath(new_path, {
								parent: true
							});
						new_dir = lookup.node
					} catch (e) {
						throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
					}
					if (!old_dir || !new_dir)
						throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
					if (old_dir.mount !== new_dir.mount) {
						throw new FS.ErrnoError(ERRNO_CODES.EXDEV)
					}
					var old_node = FS.lookupNode(old_dir, old_name);
					var relative = PATH.relative(old_path, new_dirname);
					if (relative.charAt(0) !== ".") {
						throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
					}
					relative = PATH.relative(new_path, old_dirname);
					if (relative.charAt(0) !== ".") {
						throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
					}
					var new_node;
					try {
						new_node = FS.lookupNode(new_dir, new_name)
					} catch (e) {}
					if (old_node === new_node) {
						return
					}
					var isdir = FS.isDir(old_node.mode);
					var err = FS.mayDelete(old_dir, old_name, isdir);
					if (err) {
						throw new FS.ErrnoError(err)
					}
					err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
					if (err) {
						throw new FS.ErrnoError(err)
					}
					if (!old_dir.node_ops.rename) {
						throw new FS.ErrnoError(ERRNO_CODES.EPERM)
					}
					if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
						throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
					}
					if (new_dir !== old_dir) {
						err = FS.nodePermissions(old_dir, "w");
						if (err) {
							throw new FS.ErrnoError(err)
						}
					}
					try {
						if (FS.trackingDelegate["willMovePath"]) {
							FS.trackingDelegate["willMovePath"](old_path, new_path)
						}
					} catch (e) {
						console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
					}
					FS.hashRemoveNode(old_node);
					try {
						old_dir.node_ops.rename(old_node, new_dir, new_name)
					} catch (e) {
						throw e
					}
					finally {
						FS.hashAddNode(old_node)
					}
					try {
						if (FS.trackingDelegate["onMovePath"])
							FS.trackingDelegate["onMovePath"](old_path, new_path)
					} catch (e) {
						console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
					}
				}),
				rmdir: (function (path) {
					var lookup = FS.lookupPath(path, {
							parent: true
						});
					var parent = lookup.node;
					var name = PATH.basename(path);
					var node = FS.lookupNode(parent, name);
					var err = FS.mayDelete(parent, name, true);
					if (err) {
						throw new FS.ErrnoError(err)
					}
					if (!parent.node_ops.rmdir) {
						throw new FS.ErrnoError(ERRNO_CODES.EPERM)
					}
					if (FS.isMountpoint(node)) {
						throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
					}
					try {
						if (FS.trackingDelegate["willDeletePath"]) {
							FS.trackingDelegate["willDeletePath"](path)
						}
					} catch (e) {
						console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
					}
					parent.node_ops.rmdir(parent, name);
					FS.destroyNode(node);
					try {
						if (FS.trackingDelegate["onDeletePath"])
							FS.trackingDelegate["onDeletePath"](path)
					} catch (e) {
						console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
					}
				}),
				readdir: (function (path) {
					var lookup = FS.lookupPath(path, {
							follow: true
						});
					var node = lookup.node;
					if (!node.node_ops.readdir) {
						throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
					}
					return node.node_ops.readdir(node)
				}),
				unlink: (function (path) {
					var lookup = FS.lookupPath(path, {
							parent: true
						});
					var parent = lookup.node;
					var name = PATH.basename(path);
					var node = FS.lookupNode(parent, name);
					var err = FS.mayDelete(parent, name, false);
					if (err) {
						if (err === ERRNO_CODES.EISDIR)
							err = ERRNO_CODES.EPERM;
						throw new FS.ErrnoError(err)
					}
					if (!parent.node_ops.unlink) {
						throw new FS.ErrnoError(ERRNO_CODES.EPERM)
					}
					if (FS.isMountpoint(node)) {
						throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
					}
					try {
						if (FS.trackingDelegate["willDeletePath"]) {
							FS.trackingDelegate["willDeletePath"](path)
						}
					} catch (e) {
						console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
					}
					parent.node_ops.unlink(parent, name);
					FS.destroyNode(node);
					try {
						if (FS.trackingDelegate["onDeletePath"])
							FS.trackingDelegate["onDeletePath"](path)
					} catch (e) {
						console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
					}
				}),
				readlink: (function (path) {
					var lookup = FS.lookupPath(path);
					var link = lookup.node;
					if (!link) {
						throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
					}
					if (!link.node_ops.readlink) {
						throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
					}
					return PATH.resolve(FS.getPath(lookup.node.parent), link.node_ops.readlink(link))
				}),
				stat: (function (path, dontFollow) {
					var lookup = FS.lookupPath(path, {
							follow: !dontFollow
						});
					var node = lookup.node;
					if (!node) {
						throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
					}
					if (!node.node_ops.getattr) {
						throw new FS.ErrnoError(ERRNO_CODES.EPERM)
					}
					return node.node_ops.getattr(node)
				}),
				lstat: (function (path) {
					return FS.stat(path, true)
				}),
				chmod: (function (path, mode, dontFollow) {
					var node;
					if (typeof path === "string") {
						var lookup = FS.lookupPath(path, {
								follow: !dontFollow
							});
						node = lookup.node
					} else {
						node = path
					}
					if (!node.node_ops.setattr) {
						throw new FS.ErrnoError(ERRNO_CODES.EPERM)
					}
					node.node_ops.setattr(node, {
						mode: mode & 4095 | node.mode & ~4095,
						timestamp: Date.now()
					})
				}),
				lchmod: (function (path, mode) {
					FS.chmod(path, mode, true)
				}),
				fchmod: (function (fd, mode) {
					var stream = FS.getStream(fd);
					if (!stream) {
						throw new FS.ErrnoError(ERRNO_CODES.EBADF)
					}
					FS.chmod(stream.node, mode)
				}),
				chown: (function (path, uid, gid, dontFollow) {
					var node;
					if (typeof path === "string") {
						var lookup = FS.lookupPath(path, {
								follow: !dontFollow
							});
						node = lookup.node
					} else {
						node = path
					}
					if (!node.node_ops.setattr) {
						throw new FS.ErrnoError(ERRNO_CODES.EPERM)
					}
					node.node_ops.setattr(node, {
						timestamp: Date.now()
					})
				}),
				lchown: (function (path, uid, gid) {
					FS.chown(path, uid, gid, true)
				}),
				fchown: (function (fd, uid, gid) {
					var stream = FS.getStream(fd);
					if (!stream) {
						throw new FS.ErrnoError(ERRNO_CODES.EBADF)
					}
					FS.chown(stream.node, uid, gid)
				}),
				truncate: (function (path, len) {
					if (len < 0) {
						throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
					}
					var node;
					if (typeof path === "string") {
						var lookup = FS.lookupPath(path, {
								follow: true
							});
						node = lookup.node
					} else {
						node = path
					}
					if (!node.node_ops.setattr) {
						throw new FS.ErrnoError(ERRNO_CODES.EPERM)
					}
					if (FS.isDir(node.mode)) {
						throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
					}
					if (!FS.isFile(node.mode)) {
						throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
					}
					var err = FS.nodePermissions(node, "w");
					if (err) {
						throw new FS.ErrnoError(err)
					}
					node.node_ops.setattr(node, {
						size: len,
						timestamp: Date.now()
					})
				}),
				ftruncate: (function (fd, len) {
					var stream = FS.getStream(fd);
					if (!stream) {
						throw new FS.ErrnoError(ERRNO_CODES.EBADF)
					}
					if ((stream.flags & 2097155) === 0) {
						throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
					}
					FS.truncate(stream.node, len)
				}),
				utime: (function (path, atime, mtime) {
					var lookup = FS.lookupPath(path, {
							follow: true
						});
					var node = lookup.node;
					node.node_ops.setattr(node, {
						timestamp: Math.max(atime, mtime)
					})
				}),
				open: (function (path, flags, mode, fd_start, fd_end) {
					if (path === "") {
						throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
					}
					flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
					mode = typeof mode === "undefined" ? 438 : mode;
					if (flags & 64) {
						mode = mode & 4095 | 32768
					} else {
						mode = 0
					}
					var node;
					if (typeof path === "object") {
						node = path
					} else {
						path = PATH.normalize(path);
						try {
							var lookup = FS.lookupPath(path, {
									follow: !(flags & 131072)
								});
							node = lookup.node
						} catch (e) {}
					}
					var created = false;
					if (flags & 64) {
						if (node) {
							if (flags & 128) {
								throw new FS.ErrnoError(ERRNO_CODES.EEXIST)
							}
						} else {
							node = FS.mknod(path, mode, 0);
							created = true
						}
					}
					if (!node) {
						throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
					}
					if (FS.isChrdev(node.mode)) {
						flags &= ~512
					}
					if (!created) {
						var err = FS.mayOpen(node, flags);
						if (err) {
							throw new FS.ErrnoError(err)
						}
					}
					if (flags & 512) {
						FS.truncate(node, 0)
					}
					flags &= ~(128 | 512);
					var stream = FS.createStream({
							node: node,
							path: FS.getPath(node),
							flags: flags,
							seekable: true,
							position: 0,
							stream_ops: node.stream_ops,
							ungotten: [],
							error: false
						}, fd_start, fd_end);
					if (stream.stream_ops.open) {
						stream.stream_ops.open(stream)
					}
					if (Module["logReadFiles"] && !(flags & 1)) {
						if (!FS.readFiles)
							FS.readFiles = {};
						if (!(path in FS.readFiles)) {
							FS.readFiles[path] = 1;
							Module["printErr"]("read file: " + path)
						}
					}
					try {
						if (FS.trackingDelegate["onOpenFile"]) {
							var trackingFlags = 0;
							if ((flags & 2097155) !== 1) {
								trackingFlags |= FS.tracking.openFlags.READ
							}
							if ((flags & 2097155) !== 0) {
								trackingFlags |= FS.tracking.openFlags.WRITE
							}
							FS.trackingDelegate["onOpenFile"](path, trackingFlags)
						}
					} catch (e) {
						console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message)
					}
					return stream
				}),
				close: (function (stream) {
					try {
						if (stream.stream_ops.close) {
							stream.stream_ops.close(stream)
						}
					} catch (e) {
						throw e
					}
					finally {
						FS.closeStream(stream.fd)
					}
				}),
				llseek: (function (stream, offset, whence) {
					if (!stream.seekable || !stream.stream_ops.llseek) {
						throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
					}
					stream.position = stream.stream_ops.llseek(stream, offset, whence);
					stream.ungotten = [];
					return stream.position
				}),
				read: (function (stream, buffer, offset, length, position) {
					if (length < 0 || position < 0) {
						throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
					}
					if ((stream.flags & 2097155) === 1) {
						throw new FS.ErrnoError(ERRNO_CODES.EBADF)
					}
					if (FS.isDir(stream.node.mode)) {
						throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
					}
					if (!stream.stream_ops.read) {
						throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
					}
					var seeking = true;
					if (typeof position === "undefined") {
						position = stream.position;
						seeking = false
					} else if (!stream.seekable) {
						throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
					}
					var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
					if (!seeking)
						stream.position += bytesRead;
					return bytesRead
				}),
				write: (function (stream, buffer, offset, length, position, canOwn) {
					if (length < 0 || position < 0) {
						throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
					}
					if ((stream.flags & 2097155) === 0) {
						throw new FS.ErrnoError(ERRNO_CODES.EBADF)
					}
					if (FS.isDir(stream.node.mode)) {
						throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
					}
					if (!stream.stream_ops.write) {
						throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
					}
					if (stream.flags & 1024) {
						FS.llseek(stream, 0, 2)
					}
					var seeking = true;
					if (typeof position === "undefined") {
						position = stream.position;
						seeking = false
					} else if (!stream.seekable) {
						throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
					}
					var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
					if (!seeking)
						stream.position += bytesWritten;
					try {
						if (stream.path && FS.trackingDelegate["onWriteToFile"])
							FS.trackingDelegate["onWriteToFile"](stream.path)
					} catch (e) {
						console.log("FS.trackingDelegate['onWriteToFile']('" + path + "') threw an exception: " + e.message)
					}
					return bytesWritten
				}),
				allocate: (function (stream, offset, length) {
					if (offset < 0 || length <= 0) {
						throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
					}
					if ((stream.flags & 2097155) === 0) {
						throw new FS.ErrnoError(ERRNO_CODES.EBADF)
					}
					if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
						throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
					}
					if (!stream.stream_ops.allocate) {
						throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
					}
					stream.stream_ops.allocate(stream, offset, length)
				}),
				mmap: (function (stream, buffer, offset, length, position, prot, flags) {
					if ((stream.flags & 2097155) === 1) {
						throw new FS.ErrnoError(ERRNO_CODES.EACCES)
					}
					if (!stream.stream_ops.mmap) {
						throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
					}
					return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags)
				}),
				msync: (function (stream, buffer, offset, length, mmapFlags) {
					if (!stream || !stream.stream_ops.msync) {
						return 0
					}
					return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
				}),
				munmap: (function (stream) {
					return 0
				}),
				ioctl: (function (stream, cmd, arg) {
					if (!stream.stream_ops.ioctl) {
						throw new FS.ErrnoError(ERRNO_CODES.ENOTTY)
					}
					return stream.stream_ops.ioctl(stream, cmd, arg)
				}),
				readFile: (function (path, opts) {
					opts = opts || {};
					opts.flags = opts.flags || "r";
					opts.encoding = opts.encoding || "binary";
					if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
						throw new Error('Invalid encoding type "' + opts.encoding + '"')
					}
					var ret;
					var stream = FS.open(path, opts.flags);
					var stat = FS.stat(path);
					var length = stat.size;
					var buf = new Uint8Array(length);
					FS.read(stream, buf, 0, length, 0);
					if (opts.encoding === "utf8") {
						ret = UTF8ArrayToString(buf, 0)
					} else if (opts.encoding === "binary") {
						ret = buf
					}
					FS.close(stream);
					return ret
				}),
				writeFile: (function (path, data, opts) {
					opts = opts || {};
					opts.flags = opts.flags || "w";
					opts.encoding = opts.encoding || "utf8";
					if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
						throw new Error('Invalid encoding type "' + opts.encoding + '"')
					}
					var stream = FS.open(path, opts.flags, opts.mode);
					if (opts.encoding === "utf8") {
						var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
						var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
						FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn)
					} else if (opts.encoding === "binary") {
						FS.write(stream, data, 0, data.length, 0, opts.canOwn)
					}
					FS.close(stream)
				}),
				cwd: (function () {
					return FS.currentPath
				}),
				chdir: (function (path) {
					var lookup = FS.lookupPath(path, {
							follow: true
						});
					if (!FS.isDir(lookup.node.mode)) {
						throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
					}
					var err = FS.nodePermissions(lookup.node, "x");
					if (err) {
						throw new FS.ErrnoError(err)
					}
					FS.currentPath = lookup.path
				}),
				createDefaultDirectories: (function () {
					FS.mkdir("/tmp");
					FS.mkdir("/home");
					FS.mkdir("/home/web_user")
				}),
				createDefaultDevices: (function () {
					FS.mkdir("/dev");
					FS.registerDevice(FS.makedev(1, 3), {
						read: (function () {
							return 0
						}),
						write: (function (stream, buffer, offset, length, pos) {
							return length
						})
					});
					FS.mkdev("/dev/null", FS.makedev(1, 3));
					TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
					TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
					FS.mkdev("/dev/tty", FS.makedev(5, 0));
					FS.mkdev("/dev/tty1", FS.makedev(6, 0));
					var random_device;
					if (typeof crypto !== "undefined") {
						var randomBuffer = new Uint8Array(1);
						random_device = (function () {
							crypto.getRandomValues(randomBuffer);
							return randomBuffer[0]
						})
					} else if (ENVIRONMENT_IS_NODE) {
						random_device = (function () {
							return require("crypto").randomBytes(1)[0]
						})
					} else {
						random_device = (function () {
							return Math.random() * 256 | 0
						})
					}
					FS.createDevice("/dev", "random", random_device);
					FS.createDevice("/dev", "urandom", random_device);
					FS.mkdir("/dev/shm");
					FS.mkdir("/dev/shm/tmp")
				}),
				createStandardStreams: (function () {
					if (Module["stdin"]) {
						FS.createDevice("/dev", "stdin", Module["stdin"])
					} else {
						FS.symlink("/dev/tty", "/dev/stdin")
					}
					if (Module["stdout"]) {
						FS.createDevice("/dev", "stdout", null, Module["stdout"])
					} else {
						FS.symlink("/dev/tty", "/dev/stdout")
					}
					if (Module["stderr"]) {
						FS.createDevice("/dev", "stderr", null, Module["stderr"])
					} else {
						FS.symlink("/dev/tty1", "/dev/stderr")
					}
					var stdin = FS.open("/dev/stdin", "r");
					HEAP32[_stdin >> 2] = FS.getPtrForStream(stdin);
					assert(stdin.fd === 0, "invalid handle for stdin (" + stdin.fd + ")");
					var stdout = FS.open("/dev/stdout", "w");
					HEAP32[_stdout >> 2] = FS.getPtrForStream(stdout);
					assert(stdout.fd === 1, "invalid handle for stdout (" + stdout.fd + ")");
					var stderr = FS.open("/dev/stderr", "w");
					HEAP32[_stderr >> 2] = FS.getPtrForStream(stderr);
					assert(stderr.fd === 2, "invalid handle for stderr (" + stderr.fd + ")")
				}),
				ensureErrnoError: (function () {
					if (FS.ErrnoError)
						return;
					FS.ErrnoError = function ErrnoError(errno, node) {
						this.node = node;
						this.setErrno = (function (errno) {
							this.errno = errno;
							for (var key in ERRNO_CODES) {
								if (ERRNO_CODES[key] === errno) {
									this.code = key;
									break
								}
							}
						});
						this.setErrno(errno);
						this.message = ERRNO_MESSAGES[errno]
					};
					FS.ErrnoError.prototype = new Error;
					FS.ErrnoError.prototype.constructor = FS.ErrnoError;
					[ERRNO_CODES.ENOENT].forEach((function (code) {
							FS.genericErrors[code] = new FS.ErrnoError(code);
							FS.genericErrors[code].stack = "<generic error, no stack>"
						}))
				}),
				staticInit: (function () {
					FS.ensureErrnoError();
					FS.nameTable = new Array(4096);
					FS.mount(MEMFS, {}, "/");
					FS.createDefaultDirectories();
					FS.createDefaultDevices()
				}),
				init: (function (input, output, error) {
					assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
					FS.init.initialized = true;
					FS.ensureErrnoError();
					Module["stdin"] = input || Module["stdin"];
					Module["stdout"] = output || Module["stdout"];
					Module["stderr"] = error || Module["stderr"];
					FS.createStandardStreams()
				}),
				quit: (function () {
					FS.init.initialized = false;
					for (var i = 0; i < FS.streams.length; i++) {
						var stream = FS.streams[i];
						if (!stream) {
							continue
						}
						FS.close(stream)
					}
				}),
				getMode: (function (canRead, canWrite) {
					var mode = 0;
					if (canRead)
						mode |= 292 | 73;
					if (canWrite)
						mode |= 146;
					return mode
				}),
				joinPath: (function (parts, forceRelative) {
					var path = PATH.join.apply(null, parts);
					if (forceRelative && path[0] == "/")
						path = path.substr(1);
					return path
				}),
				absolutePath: (function (relative, base) {
					return PATH.resolve(base, relative)
				}),
				standardizePath: (function (path) {
					return PATH.normalize(path)
				}),
				findObject: (function (path, dontResolveLastLink) {
					var ret = FS.analyzePath(path, dontResolveLastLink);
					if (ret.exists) {
						return ret.object
					} else {
						___setErrNo(ret.error);
						return null
					}
				}),
				analyzePath: (function (path, dontResolveLastLink) {
					try {
						var lookup = FS.lookupPath(path, {
								follow: !dontResolveLastLink
							});
						path = lookup.path
					} catch (e) {}
					var ret = {
						isRoot: false,
						exists: false,
						error: 0,
						name: null,
						path: null,
						object: null,
						parentExists: false,
						parentPath: null,
						parentObject: null
					};
					try {
						var lookup = FS.lookupPath(path, {
								parent: true
							});
						ret.parentExists = true;
						ret.parentPath = lookup.path;
						ret.parentObject = lookup.node;
						ret.name = PATH.basename(path);
						lookup = FS.lookupPath(path, {
								follow: !dontResolveLastLink
							});
						ret.exists = true;
						ret.path = lookup.path;
						ret.object = lookup.node;
						ret.name = lookup.node.name;
						ret.isRoot = lookup.path === "/"
					} catch (e) {
						ret.error = e.errno
					}
					return ret
				}),
				createFolder: (function (parent, name, canRead, canWrite) {
					var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
					var mode = FS.getMode(canRead, canWrite);
					return FS.mkdir(path, mode)
				}),
				createPath: (function (parent, path, canRead, canWrite) {
					parent = typeof parent === "string" ? parent : FS.getPath(parent);
					var parts = path.split("/").reverse();
					while (parts.length) {
						var part = parts.pop();
						if (!part)
							continue;
						var current = PATH.join2(parent, part);
						try {
							FS.mkdir(current)
						} catch (e) {}
						parent = current
					}
					return current
				}),
				createFile: (function (parent, name, properties, canRead, canWrite) {
					var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
					var mode = FS.getMode(canRead, canWrite);
					return FS.create(path, mode)
				}),
				createDataFile: (function (parent, name, data, canRead, canWrite, canOwn) {
					var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
					var mode = FS.getMode(canRead, canWrite);
					var node = FS.create(path, mode);
					if (data) {
						if (typeof data === "string") {
							var arr = new Array(data.length);
							for (var i = 0, len = data.length; i < len; ++i)
								arr[i] = data.charCodeAt(i);
							data = arr
						}
						FS.chmod(node, mode | 146);
						var stream = FS.open(node, "w");
						FS.write(stream, data, 0, data.length, 0, canOwn);
						FS.close(stream);
						FS.chmod(node, mode)
					}
					return node
				}),
				createDevice: (function (parent, name, input, output) {
					var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
					var mode = FS.getMode(!!input, !!output);
					if (!FS.createDevice.major)
						FS.createDevice.major = 64;
					var dev = FS.makedev(FS.createDevice.major++, 0);
					FS.registerDevice(dev, {
						open: (function (stream) {
							stream.seekable = false
						}),
						close: (function (stream) {
							if (output && output.buffer && output.buffer.length) {
								output(10)
							}
						}),
						read: (function (stream, buffer, offset, length, pos) {
							var bytesRead = 0;
							for (var i = 0; i < length; i++) {
								var result;
								try {
									result = input()
								} catch (e) {
									throw new FS.ErrnoError(ERRNO_CODES.EIO)
								}
								if (result === undefined && bytesRead === 0) {
									throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
								}
								if (result === null || result === undefined)
									break;
								bytesRead++;
								buffer[offset + i] = result
							}
							if (bytesRead) {
								stream.node.timestamp = Date.now()
							}
							return bytesRead
						}),
						write: (function (stream, buffer, offset, length, pos) {
							for (var i = 0; i < length; i++) {
								try {
									output(buffer[offset + i])
								} catch (e) {
									throw new FS.ErrnoError(ERRNO_CODES.EIO)
								}
							}
							if (length) {
								stream.node.timestamp = Date.now()
							}
							return i
						})
					});
					return FS.mkdev(path, mode, dev)
				}),
				createLink: (function (parent, name, target, canRead, canWrite) {
					var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
					return FS.symlink(target, path)
				}),
				forceLoadFile: (function (obj) {
					if (obj.isDevice || obj.isFolder || obj.link || obj.contents)
						return true;
					var success = true;
					if (typeof XMLHttpRequest !== "undefined") {
						throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")
					} else if (Module["read"]) {
						try {
							obj.contents = intArrayFromString(Module["read"](obj.url), true);
							obj.usedBytes = obj.contents.length
						} catch (e) {
							success = false
						}
					} else {
						throw new Error("Cannot load without read() or XMLHttpRequest.")
					}
					if (!success)
						___setErrNo(ERRNO_CODES.EIO);
					return success
				}),
				createLazyFile: (function (parent, name, url, canRead, canWrite) {
					function LazyUint8Array() {
						this.lengthKnown = false;
						this.chunks = []
					}
					LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
						if (idx > this.length - 1 || idx < 0) {
							return undefined
						}
						var chunkOffset = idx % this.chunkSize;
						var chunkNum = idx / this.chunkSize | 0;
						return this.getter(chunkNum)[chunkOffset]
					};
					LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
						this.getter = getter
					};
					LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
						var xhr = new XMLHttpRequest;
						xhr.open("HEAD", url, false);
						xhr.send(null);
						if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
							throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
						var datalength = Number(xhr.getResponseHeader("Content-length"));
						var header;
						var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
						var chunkSize = 1024 * 1024;
						if (!hasByteServing)
							chunkSize = datalength;
						var doXHR = (function (from, to) {
							if (from > to)
								throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
							if (to > datalength - 1)
								throw new Error("only " + datalength + " bytes available! programmer error!");
							var xhr = new XMLHttpRequest;
							xhr.open("GET", url, false);
							if (datalength !== chunkSize)
								xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
							if (typeof Uint8Array != "undefined")
								xhr.responseType = "arraybuffer";
							if (xhr.overrideMimeType) {
								xhr.overrideMimeType("text/plain; charset=x-user-defined")
							}
							xhr.send(null);
							if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
								throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
							if (xhr.response !== undefined) {
								return new Uint8Array(xhr.response || [])
							} else {
								return intArrayFromString(xhr.responseText || "", true)
							}
						});
						var lazyArray = this;
						lazyArray.setDataGetter((function (chunkNum) {
								var start = chunkNum * chunkSize;
								var end = (chunkNum + 1) * chunkSize - 1;
								end = Math.min(end, datalength - 1);
								if (typeof lazyArray.chunks[chunkNum] === "undefined") {
									lazyArray.chunks[chunkNum] = doXHR(start, end)
								}
								if (typeof lazyArray.chunks[chunkNum] === "undefined")
									throw new Error("doXHR failed!");
								return lazyArray.chunks[chunkNum]
							}));
						this._length = datalength;
						this._chunkSize = chunkSize;
						this.lengthKnown = true
					};
					if (typeof XMLHttpRequest !== "undefined") {
						if (!ENVIRONMENT_IS_WORKER)
							throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
						var lazyArray = new LazyUint8Array;
						Object.defineProperty(lazyArray, "length", {
							get: (function () {
								if (!this.lengthKnown) {
									this.cacheLength()
								}
								return this._length
							})
						});
						Object.defineProperty(lazyArray, "chunkSize", {
							get: (function () {
								if (!this.lengthKnown) {
									this.cacheLength()
								}
								return this._chunkSize
							})
						});
						var properties = {
							isDevice: false,
							contents: lazyArray
						}
					} else {
						var properties = {
							isDevice: false,
							url: url
						}
					}
					var node = FS.createFile(parent, name, properties, canRead, canWrite);
					if (properties.contents) {
						node.contents = properties.contents
					} else if (properties.url) {
						node.contents = null;
						node.url = properties.url
					}
					Object.defineProperty(node, "usedBytes", {
						get: (function () {
							return this.contents.length
						})
					});
					var stream_ops = {};
					var keys = Object.keys(node.stream_ops);
					keys.forEach((function (key) {
							var fn = node.stream_ops[key];
							stream_ops[key] = function forceLoadLazyFile() {
								if (!FS.forceLoadFile(node)) {
									throw new FS.ErrnoError(ERRNO_CODES.EIO)
								}
								return fn.apply(null, arguments)
							}
						}));
					stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
						if (!FS.forceLoadFile(node)) {
							throw new FS.ErrnoError(ERRNO_CODES.EIO)
						}
						var contents = stream.node.contents;
						if (position >= contents.length)
							return 0;
						var size = Math.min(contents.length - position, length);
						assert(size >= 0);
						if (contents.slice) {
							for (var i = 0; i < size; i++) {
								buffer[offset + i] = contents[position + i]
							}
						} else {
							for (var i = 0; i < size; i++) {
								buffer[offset + i] = contents.get(position + i)
							}
						}
						return size
					};
					node.stream_ops = stream_ops;
					return node
				}),
				createPreloadedFile: (function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
					Browser.init();
					var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
					var dep = getUniqueRunDependency("cp " + fullname);
					function processData(byteArray) {
						function finish(byteArray) {
							if (preFinish)
								preFinish();
							if (!dontCreateFile) {
								FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
							}
							if (onload)
								onload();
							removeRunDependency(dep)
						}
						var handled = false;
						Module["preloadPlugins"].forEach((function (plugin) {
								if (handled)
									return;
								if (plugin["canHandle"](fullname)) {
									plugin["handle"](byteArray, fullname, finish, (function () {
											if (onerror)
												onerror();
											removeRunDependency(dep)
										}));
									handled = true
								}
							}));
						if (!handled)
							finish(byteArray)
					}
					addRunDependency(dep);
					if (typeof url == "string") {
						Browser.asyncLoad(url, (function (byteArray) {
								processData(byteArray)
							}), onerror)
					} else {
						processData(url)
					}
				}),
				indexedDB: (function () {
					return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
				}),
				DB_NAME: (function () {
					return "EM_FS_" + window.location.pathname
				}),
				DB_VERSION: 20,
				DB_STORE_NAME: "FILE_DATA",
				saveFilesToDB: (function (paths, onload, onerror) {
					onload = onload || (function () {});
					onerror = onerror || (function () {});
					var indexedDB = FS.indexedDB();
					try {
						var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
					} catch (e) {
						return onerror(e)
					}
					openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
						console.log("creating db");
						var db = openRequest.result;
						db.createObjectStore(FS.DB_STORE_NAME)
					};
					openRequest.onsuccess = function openRequest_onsuccess() {
						var db = openRequest.result;
						var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
						var files = transaction.objectStore(FS.DB_STORE_NAME);
						var ok = 0,
						fail = 0,
						total = paths.length;
						function finish() {
							if (fail == 0)
								onload();
							else
								onerror()
						}
						paths.forEach((function (path) {
								var putRequest = files.put(FS.analyzePath(path).object.contents, path);
								putRequest.onsuccess = function putRequest_onsuccess() {
									ok++;
									if (ok + fail == total)
										finish()
								};
								putRequest.onerror = function putRequest_onerror() {
									fail++;
									if (ok + fail == total)
										finish()
								}
							}));
						transaction.onerror = onerror
					};
					openRequest.onerror = onerror
				}),
				loadFilesFromDB: (function (paths, onload, onerror) {
					onload = onload || (function () {});
					onerror = onerror || (function () {});
					var indexedDB = FS.indexedDB();
					try {
						var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
					} catch (e) {
						return onerror(e)
					}
					openRequest.onupgradeneeded = onerror;
					openRequest.onsuccess = function openRequest_onsuccess() {
						var db = openRequest.result;
						try {
							var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")
						} catch (e) {
							onerror(e);
							return
						}
						var files = transaction.objectStore(FS.DB_STORE_NAME);
						var ok = 0,
						fail = 0,
						total = paths.length;
						function finish() {
							if (fail == 0)
								onload();
							else
								onerror()
						}
						paths.forEach((function (path) {
								var getRequest = files.get(path);
								getRequest.onsuccess = function getRequest_onsuccess() {
									if (FS.analyzePath(path).exists) {
										FS.unlink(path)
									}
									FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
									ok++;
									if (ok + fail == total)
										finish()
								};
								getRequest.onerror = function getRequest_onerror() {
									fail++;
									if (ok + fail == total)
										finish()
								}
							}));
						transaction.onerror = onerror
					};
					openRequest.onerror = onerror
				})
			};
			function _mkport() {
				throw "TODO"
			}
			var SOCKFS = {
				mount: (function (mount) {
					Module["websocket"] = Module["websocket"] && "object" === typeof Module["websocket"] ? Module["websocket"] : {};
					Module["websocket"]._callbacks = {};
					Module["websocket"]["on"] = (function (event, callback) {
						if ("function" === typeof callback) {
							this._callbacks[event] = callback
						}
						return this
					});
					Module["websocket"].emit = (function (event, param) {
						if ("function" === typeof this._callbacks[event]) {
							this._callbacks[event].call(this, param)
						}
					});
					return FS.createNode(null, "/", 16384 | 511, 0)
				}),
				createSocket: (function (family, type, protocol) {
					var streaming = type == 1;
					if (protocol) {
						assert(streaming == (protocol == 6))
					}
					var sock = {
						family: family,
						type: type,
						protocol: protocol,
						server: null,
						error: null,
						peers: {},
						pending: [],
						recv_queue: [],
						sock_ops: SOCKFS.websocket_sock_ops
					};
					var name = SOCKFS.nextname();
					var node = FS.createNode(SOCKFS.root, name, 49152, 0);
					node.sock = sock;
					var stream = FS.createStream({
							path: name,
							node: node,
							flags: FS.modeStringToFlags("r+"),
							seekable: false,
							stream_ops: SOCKFS.stream_ops
						});
					sock.stream = stream;
					return sock
				}),
				getSocket: (function (fd) {
					var stream = FS.getStream(fd);
					if (!stream || !FS.isSocket(stream.node.mode)) {
						return null
					}
					return stream.node.sock
				}),
				stream_ops: {
					poll: (function (stream) {
						var sock = stream.node.sock;
						return sock.sock_ops.poll(sock)
					}),
					ioctl: (function (stream, request, varargs) {
						var sock = stream.node.sock;
						return sock.sock_ops.ioctl(sock, request, varargs)
					}),
					read: (function (stream, buffer, offset, length, position) {
						var sock = stream.node.sock;
						var msg = sock.sock_ops.recvmsg(sock, length);
						if (!msg) {
							return 0
						}
						buffer.set(msg.buffer, offset);
						return msg.buffer.length
					}),
					write: (function (stream, buffer, offset, length, position) {
						var sock = stream.node.sock;
						return sock.sock_ops.sendmsg(sock, buffer, offset, length)
					}),
					close: (function (stream) {
						var sock = stream.node.sock;
						sock.sock_ops.close(sock)
					})
				},
				nextname: (function () {
					if (!SOCKFS.nextname.current) {
						SOCKFS.nextname.current = 0
					}
					return "socket[" + SOCKFS.nextname.current++ + "]"
				}),
				websocket_sock_ops: {
					createPeer: (function (sock, addr, port) {
						var ws;
						if (typeof addr === "object") {
							ws = addr;
							addr = null;
							port = null
						}
						if (ws) {
							if (ws._socket) {
								addr = ws._socket.remoteAddress;
								port = ws._socket.remotePort
							} else {
								var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
								if (!result) {
									throw new Error("WebSocket URL must be in the format ws(s)://address:port")
								}
								addr = result[1];
								port = parseInt(result[2], 10)
							}
						} else {
							try {
								var runtimeConfig = Module["websocket"] && "object" === typeof Module["websocket"];
								var url = "ws:#".replace("#", "//");
								if (runtimeConfig) {
									if ("string" === typeof Module["websocket"]["url"]) {
										url = Module["websocket"]["url"]
									}
								}
								if (url === "ws://" || url === "wss://") {
									var parts = addr.split("/");
									url = url + parts[0] + ":" + port + "/" + parts.slice(1).join("/")
								}
								var subProtocols = "binary";
								if (runtimeConfig) {
									if ("string" === typeof Module["websocket"]["subprotocol"]) {
										subProtocols = Module["websocket"]["subprotocol"]
									}
								}
								subProtocols = subProtocols.replace(/^ +| +$/g, "").split(/ *, */);
								var opts = ENVIRONMENT_IS_NODE ? {
									"protocol": subProtocols.toString()
								}
								 : subProtocols;
								var WebSocket = ENVIRONMENT_IS_NODE ? require("ws") : window["WebSocket"];
								ws = new WebSocket(url, opts);
								ws.binaryType = "arraybuffer"
							} catch (e) {
								throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH)
							}
						}
						var peer = {
							addr: addr,
							port: port,
							socket: ws,
							dgram_send_queue: []
						};
						SOCKFS.websocket_sock_ops.addPeer(sock, peer);
						SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
						if (sock.type === 2 && typeof sock.sport !== "undefined") {
							peer.dgram_send_queue.push(new Uint8Array([255, 255, 255, 255, "p".charCodeAt(0), "o".charCodeAt(0), "r".charCodeAt(0), "t".charCodeAt(0), (sock.sport & 65280) >> 8, sock.sport & 255]))
						}
						return peer
					}),
					getPeer: (function (sock, addr, port) {
						return sock.peers[addr + ":" + port]
					}),
					addPeer: (function (sock, peer) {
						sock.peers[peer.addr + ":" + peer.port] = peer
					}),
					removePeer: (function (sock, peer) {
						delete sock.peers[peer.addr + ":" + peer.port]
					}),
					handlePeerEvents: (function (sock, peer) {
						var first = true;
						var handleOpen = (function () {
							Module["websocket"].emit("open", sock.stream.fd);
							try {
								var queued = peer.dgram_send_queue.shift();
								while (queued) {
									peer.socket.send(queued);
									queued = peer.dgram_send_queue.shift()
								}
							} catch (e) {
								peer.socket.close()
							}
						});
						function handleMessage(data) {
							assert(typeof data !== "string" && data.byteLength !== undefined);
							data = new Uint8Array(data);
							var wasfirst = first;
							first = false;
							if (wasfirst && data.length === 10 && data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 && data[4] === "p".charCodeAt(0) && data[5] === "o".charCodeAt(0) && data[6] === "r".charCodeAt(0) && data[7] === "t".charCodeAt(0)) {
								var newport = data[8] << 8 | data[9];
								SOCKFS.websocket_sock_ops.removePeer(sock, peer);
								peer.port = newport;
								SOCKFS.websocket_sock_ops.addPeer(sock, peer);
								return
							}
							sock.recv_queue.push({
								addr: peer.addr,
								port: peer.port,
								data: data
							});
							Module["websocket"].emit("message", sock.stream.fd)
						}
						if (ENVIRONMENT_IS_NODE) {
							peer.socket.on("open", handleOpen);
							peer.socket.on("message", (function (data, flags) {
									if (!flags.binary) {
										return
									}
									handleMessage((new Uint8Array(data)).buffer)
								}));
							peer.socket.on("close", (function () {
									Module["websocket"].emit("close", sock.stream.fd)
								}));
							peer.socket.on("error", (function (error) {
									sock.error = ERRNO_CODES.ECONNREFUSED;
									Module["websocket"].emit("error", [sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused"])
								}))
						} else {
							peer.socket.onopen = handleOpen;
							peer.socket.onclose = (function () {
								Module["websocket"].emit("close", sock.stream.fd)
							});
							peer.socket.onmessage = function peer_socket_onmessage(event) {
								handleMessage(event.data)
							};
							peer.socket.onerror = (function (error) {
								sock.error = ERRNO_CODES.ECONNREFUSED;
								Module["websocket"].emit("error", [sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused"])
							})
						}
					}),
					poll: (function (sock) {
						if (sock.type === 1 && sock.server) {
							return sock.pending.length ? 64 | 1 : 0
						}
						var mask = 0;
						var dest = sock.type === 1 ? SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) : null;
						if (sock.recv_queue.length || !dest || dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
							mask |= 64 | 1
						}
						if (!dest || dest && dest.socket.readyState === dest.socket.OPEN) {
							mask |= 4
						}
						if (dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
							mask |= 16
						}
						return mask
					}),
					ioctl: (function (sock, request, arg) {
						switch (request) {
						case 21531:
							var bytes = 0;
							if (sock.recv_queue.length) {
								bytes = sock.recv_queue[0].data.length
							}
							HEAP32[arg >> 2] = bytes;
							return 0;
						default:
							return ERRNO_CODES.EINVAL
						}
					}),
					close: (function (sock) {
						if (sock.server) {
							try {
								sock.server.close()
							} catch (e) {}
							sock.server = null
						}
						var peers = Object.keys(sock.peers);
						for (var i = 0; i < peers.length; i++) {
							var peer = sock.peers[peers[i]];
							try {
								peer.socket.close()
							} catch (e) {}
							SOCKFS.websocket_sock_ops.removePeer(sock, peer)
						}
						return 0
					}),
					bind: (function (sock, addr, port) {
						if (typeof sock.saddr !== "undefined" || typeof sock.sport !== "undefined") {
							throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
						}
						sock.saddr = addr;
						sock.sport = port || _mkport();
						if (sock.type === 2) {
							if (sock.server) {
								sock.server.close();
								sock.server = null
							}
							try {
								sock.sock_ops.listen(sock, 0)
							} catch (e) {
								if (!(e instanceof FS.ErrnoError))
									throw e;
								if (e.errno !== ERRNO_CODES.EOPNOTSUPP)
									throw e
							}
						}
					}),
					connect: (function (sock, addr, port) {
						if (sock.server) {
							throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
						}
						if (typeof sock.daddr !== "undefined" && typeof sock.dport !== "undefined") {
							var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
							if (dest) {
								if (dest.socket.readyState === dest.socket.CONNECTING) {
									throw new FS.ErrnoError(ERRNO_CODES.EALREADY)
								} else {
									throw new FS.ErrnoError(ERRNO_CODES.EISCONN)
								}
							}
						}
						var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
						sock.daddr = peer.addr;
						sock.dport = peer.port;
						throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS)
					}),
					listen: (function (sock, backlog) {
						if (!ENVIRONMENT_IS_NODE) {
							throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
						}
						if (sock.server) {
							throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
						}
						var WebSocketServer = require("ws").Server;
						var host = sock.saddr;
						sock.server = new WebSocketServer({
								host: host,
								port: sock.sport
							});
						Module["websocket"].emit("listen", sock.stream.fd);
						sock.server.on("connection", (function (ws) {
								if (sock.type === 1) {
									var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
									var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
									newsock.daddr = peer.addr;
									newsock.dport = peer.port;
									sock.pending.push(newsock);
									Module["websocket"].emit("connection", newsock.stream.fd)
								} else {
									SOCKFS.websocket_sock_ops.createPeer(sock, ws);
									Module["websocket"].emit("connection", sock.stream.fd)
								}
							}));
						sock.server.on("closed", (function () {
								Module["websocket"].emit("close", sock.stream.fd);
								sock.server = null
							}));
						sock.server.on("error", (function (error) {
								sock.error = ERRNO_CODES.EHOSTUNREACH;
								Module["websocket"].emit("error", [sock.stream.fd, sock.error, "EHOSTUNREACH: Host is unreachable"])
							}))
					}),
					accept: (function (listensock) {
						if (!listensock.server) {
							throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
						}
						var newsock = listensock.pending.shift();
						newsock.stream.flags = listensock.stream.flags;
						return newsock
					}),
					getname: (function (sock, peer) {
						var addr,
						port;
						if (peer) {
							if (sock.daddr === undefined || sock.dport === undefined) {
								throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
							}
							addr = sock.daddr;
							port = sock.dport
						} else {
							addr = sock.saddr || 0;
							port = sock.sport || 0
						}
						return {
							addr: addr,
							port: port
						}
					}),
					sendmsg: (function (sock, buffer, offset, length, addr, port) {
						if (sock.type === 2) {
							if (addr === undefined || port === undefined) {
								addr = sock.daddr;
								port = sock.dport
							}
							if (addr === undefined || port === undefined) {
								throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ)
							}
						} else {
							addr = sock.daddr;
							port = sock.dport
						}
						var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
						if (sock.type === 1) {
							if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
								throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
							} else if (dest.socket.readyState === dest.socket.CONNECTING) {
								throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
							}
						}
						var data;
						if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
							data = buffer.slice(offset, offset + length)
						} else {
							data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length)
						}
						if (sock.type === 2) {
							if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
								if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
									dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port)
								}
								dest.dgram_send_queue.push(data);
								return length
							}
						}
						try {
							dest.socket.send(data);
							return length
						} catch (e) {
							throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
						}
					}),
					recvmsg: (function (sock, length) {
						if (sock.type === 1 && sock.server) {
							throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
						}
						var queued = sock.recv_queue.shift();
						if (!queued) {
							if (sock.type === 1) {
								var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
								if (!dest) {
									throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
								} else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
									return null
								} else {
									throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
								}
							} else {
								throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
							}
						}
						var queuedLength = queued.data.byteLength || queued.data.length;
						var queuedOffset = queued.data.byteOffset || 0;
						var queuedBuffer = queued.data.buffer || queued.data;
						var bytesRead = Math.min(length, queuedLength);
						var res = {
							buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
							addr: queued.addr,
							port: queued.port
						};
						if (sock.type === 1 && bytesRead < queuedLength) {
							var bytesRemaining = queuedLength - bytesRead;
							queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
							sock.recv_queue.unshift(queued)
						}
						return res
					})
				}
			};
			function _send(fd, buf, len, flags) {
				var sock = SOCKFS.getSocket(fd);
				if (!sock) {
					___setErrNo(ERRNO_CODES.EBADF);
					return -1
				}
				return _write(fd, buf, len)
			}
			function _pwrite(fildes, buf, nbyte, offset) {
				var stream = FS.getStream(fildes);
				if (!stream) {
					___setErrNo(ERRNO_CODES.EBADF);
					return -1
				}
				try {
					var slab = HEAP8;
					return FS.write(stream, slab, buf, nbyte, offset)
				} catch (e) {
					FS.handleFSError(e);
					return -1
				}
			}
			function _write(fildes, buf, nbyte) {
				var stream = FS.getStream(fildes);
				if (!stream) {
					___setErrNo(ERRNO_CODES.EBADF);
					return -1
				}
				try {
					var slab = HEAP8;
					return FS.write(stream, slab, buf, nbyte)
				} catch (e) {
					FS.handleFSError(e);
					return -1
				}
			}
			function _fileno(stream) {
				stream = FS.getStreamFromPtr(stream);
				if (!stream)
					return -1;
				return stream.fd
			}
			function _fwrite(ptr, size, nitems, stream) {
				var bytesToWrite = nitems * size;
				if (bytesToWrite == 0)
					return 0;
				var fd = _fileno(stream);
				var bytesWritten = _write(fd, ptr, bytesToWrite);
				if (bytesWritten == -1) {
					var streamObj = FS.getStreamFromPtr(stream);
					if (streamObj)
						streamObj.error = true;
					return 0
				} else {
					return bytesWritten / size | 0
				}
			}
			Module["_strlen"] = _strlen;
			function __reallyNegative(x) {
				return x < 0 || x === 0 && 1 / x === -Infinity
			}
			function __formatString(format, varargs) {
				assert((varargs & 3) === 0);
				var textIndex = format;
				var argIndex = 0;
				function getNextArg(type) {
					var ret;
					argIndex = Runtime.prepVararg(argIndex, type);
					if (type === "double") {
						ret = (HEAP32[tempDoublePtr >> 2] = HEAP32[varargs + argIndex >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[varargs + (argIndex + 4) >> 2], +HEAPF64[tempDoublePtr >> 3]);
						argIndex += 8
					} else if (type == "i64") {
						ret = [HEAP32[varargs + argIndex >> 2], HEAP32[varargs + (argIndex + 4) >> 2]];
						argIndex += 8
					} else {
						assert((argIndex & 3) === 0);
						type = "i32";
						ret = HEAP32[varargs + argIndex >> 2];
						argIndex += 4
					}
					return ret
				}
				var ret = [];
				var curr,
				next,
				currArg;
				while (1) {
					var startTextIndex = textIndex;
					curr = HEAP8[textIndex >> 0];
					if (curr === 0)
						break;
					next = HEAP8[textIndex + 1 >> 0];
					if (curr == 37) {
						var flagAlwaysSigned = false;
						var flagLeftAlign = false;
						var flagAlternative = false;
						var flagZeroPad = false;
						var flagPadSign = false;
						flagsLoop: while (1) {
							switch (next) {
							case 43:
								flagAlwaysSigned = true;
								break;
							case 45:
								flagLeftAlign = true;
								break;
							case 35:
								flagAlternative = true;
								break;
							case 48:
								if (flagZeroPad) {
									break flagsLoop
								} else {
									flagZeroPad = true;
									break
								};
							case 32:
								flagPadSign = true;
								break;
							default:
								break flagsLoop
							}
							textIndex++;
							next = HEAP8[textIndex + 1 >> 0]
						}
						var width = 0;
						if (next == 42) {
							width = getNextArg("i32");
							textIndex++;
							next = HEAP8[textIndex + 1 >> 0]
						} else {
							while (next >= 48 && next <= 57) {
								width = width * 10 + (next - 48);
								textIndex++;
								next = HEAP8[textIndex + 1 >> 0]
							}
						}
						var precisionSet = false,
						precision = -1;
						if (next == 46) {
							precision = 0;
							precisionSet = true;
							textIndex++;
							next = HEAP8[textIndex + 1 >> 0];
							if (next == 42) {
								precision = getNextArg("i32");
								textIndex++
							} else {
								while (1) {
									var precisionChr = HEAP8[textIndex + 1 >> 0];
									if (precisionChr < 48 || precisionChr > 57)
										break;
									precision = precision * 10 + (precisionChr - 48);
									textIndex++
								}
							}
							next = HEAP8[textIndex + 1 >> 0]
						}
						if (precision < 0) {
							precision = 6;
							precisionSet = false
						}
						var argSize;
						switch (String.fromCharCode(next)) {
						case "h":
							var nextNext = HEAP8[textIndex + 2 >> 0];
							if (nextNext == 104) {
								textIndex++;
								argSize = 1
							} else {
								argSize = 2
							}
							break;
						case "l":
							var nextNext = HEAP8[textIndex + 2 >> 0];
							if (nextNext == 108) {
								textIndex++;
								argSize = 8
							} else {
								argSize = 4
							}
							break;
						case "L":
						case "q":
						case "j":
							argSize = 8;
							break;
						case "z":
						case "t":
						case "I":
							argSize = 4;
							break;
						default:
							argSize = null
						}
						if (argSize)
							textIndex++;
						next = HEAP8[textIndex + 1 >> 0];
						switch (String.fromCharCode(next)) {
						case "d":
						case "i":
						case "u":
						case "o":
						case "x":
						case "X":
						case "p": {
								var signed = next == 100 || next == 105;
								argSize = argSize || 4;
								var currArg = getNextArg("i" + argSize * 8);
								var origArg = currArg;
								var argText;
								if (argSize == 8) {
									currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117)
								}
								if (argSize <= 4) {
									var limit = Math.pow(256, argSize) - 1;
									currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8)
								}
								var currAbsArg = Math.abs(currArg);
								var prefix = "";
								if (next == 100 || next == 105) {
									if (argSize == 8 && i64Math)
										argText = i64Math.stringify(origArg[0], origArg[1], null);
									else
										argText = reSign(currArg, 8 * argSize, 1).toString(10)
								} else if (next == 117) {
									if (argSize == 8 && i64Math)
										argText = i64Math.stringify(origArg[0], origArg[1], true);
									else
										argText = unSign(currArg, 8 * argSize, 1).toString(10);
									currArg = Math.abs(currArg)
								} else if (next == 111) {
									argText = (flagAlternative ? "0" : "") + currAbsArg.toString(8)
								} else if (next == 120 || next == 88) {
									prefix = flagAlternative && currArg != 0 ? "0x" : "";
									if (argSize == 8 && i64Math) {
										if (origArg[1]) {
											argText = (origArg[1] >>> 0).toString(16);
											var lower = (origArg[0] >>> 0).toString(16);
											while (lower.length < 8)
												lower = "0" + lower;
											argText += lower
										} else {
											argText = (origArg[0] >>> 0).toString(16)
										}
									} else if (currArg < 0) {
										currArg = -currArg;
										argText = (currAbsArg - 1).toString(16);
										var buffer = [];
										for (var i = 0; i < argText.length; i++) {
											buffer.push((15 - parseInt(argText[i], 16)).toString(16))
										}
										argText = buffer.join("");
										while (argText.length < argSize * 2)
											argText = "f" + argText
									} else {
										argText = currAbsArg.toString(16)
									}
									if (next == 88) {
										prefix = prefix.toUpperCase();
										argText = argText.toUpperCase()
									}
								} else if (next == 112) {
									if (currAbsArg === 0) {
										argText = "(nil)"
									} else {
										prefix = "0x";
										argText = currAbsArg.toString(16)
									}
								}
								if (precisionSet) {
									while (argText.length < precision) {
										argText = "0" + argText
									}
								}
								if (currArg >= 0) {
									if (flagAlwaysSigned) {
										prefix = "+" + prefix
									} else if (flagPadSign) {
										prefix = " " + prefix
									}
								}
								if (argText.charAt(0) == "-") {
									prefix = "-" + prefix;
									argText = argText.substr(1)
								}
								while (prefix.length + argText.length < width) {
									if (flagLeftAlign) {
										argText += " "
									} else {
										if (flagZeroPad) {
											argText = "0" + argText
										} else {
											prefix = " " + prefix
										}
									}
								}
								argText = prefix + argText;
								argText.split("").forEach((function (chr) {
										ret.push(chr.charCodeAt(0))
									}));
								break
							};
						case "f":
						case "F":
						case "e":
						case "E":
						case "g":
						case "G": {
								var currArg = getNextArg("double");
								var argText;
								if (isNaN(currArg)) {
									argText = "nan";
									flagZeroPad = false
								} else if (!isFinite(currArg)) {
									argText = (currArg < 0 ? "-" : "") + "inf";
									flagZeroPad = false
								} else {
									var isGeneral = false;
									var effectivePrecision = Math.min(precision, 20);
									if (next == 103 || next == 71) {
										isGeneral = true;
										precision = precision || 1;
										var exponent = parseInt(currArg.toExponential(effectivePrecision).split("e")[1], 10);
										if (precision > exponent && exponent >= -4) {
											next = (next == 103 ? "f" : "F").charCodeAt(0);
											precision -= exponent + 1
										} else {
											next = (next == 103 ? "e" : "E").charCodeAt(0);
											precision--
										}
										effectivePrecision = Math.min(precision, 20)
									}
									if (next == 101 || next == 69) {
										argText = currArg.toExponential(effectivePrecision);
										if (/[eE][-+]\d$/.test(argText)) {
											argText = argText.slice(0, -1) + "0" + argText.slice(-1)
										}
									} else if (next == 102 || next == 70) {
										argText = currArg.toFixed(effectivePrecision);
										if (currArg === 0 && __reallyNegative(currArg)) {
											argText = "-" + argText
										}
									}
									var parts = argText.split("e");
									if (isGeneral && !flagAlternative) {
										while (parts[0].length > 1 && parts[0].indexOf(".") != -1 && (parts[0].slice(-1) == "0" || parts[0].slice(-1) == ".")) {
											parts[0] = parts[0].slice(0, -1)
										}
									} else {
										if (flagAlternative && argText.indexOf(".") == -1)
											parts[0] += ".";
										while (precision > effectivePrecision++)
											parts[0] += "0"
									}
									argText = parts[0] + (parts.length > 1 ? "e" + parts[1] : "");
									if (next == 69)
										argText = argText.toUpperCase();
									if (currArg >= 0) {
										if (flagAlwaysSigned) {
											argText = "+" + argText
										} else if (flagPadSign) {
											argText = " " + argText
										}
									}
								}
								while (argText.length < width) {
									if (flagLeftAlign) {
										argText += " "
									} else {
										if (flagZeroPad && (argText[0] == "-" || argText[0] == "+")) {
											argText = argText[0] + "0" + argText.slice(1)
										} else {
											argText = (flagZeroPad ? "0" : " ") + argText
										}
									}
								}
								if (next < 97)
									argText = argText.toUpperCase();
								argText.split("").forEach((function (chr) {
										ret.push(chr.charCodeAt(0))
									}));
								break
							};
						case "s": {
								var arg = getNextArg("i8*");
								var argLength = arg ? _strlen(arg) : "(null)".length;
								if (precisionSet)
									argLength = Math.min(argLength, precision);
								if (!flagLeftAlign) {
									while (argLength < width--) {
										ret.push(32)
									}
								}
								if (arg) {
									for (var i = 0; i < argLength; i++) {
										ret.push(HEAPU8[arg++ >> 0])
									}
								} else {
									ret = ret.concat(intArrayFromString("(null)".substr(0, argLength), true))
								}
								if (flagLeftAlign) {
									while (argLength < width--) {
										ret.push(32)
									}
								}
								break
							};
						case "c": {
								if (flagLeftAlign)
									ret.push(getNextArg("i8"));
								while (--width > 0) {
									ret.push(32)
								}
								if (!flagLeftAlign)
									ret.push(getNextArg("i8"));
								break
							};
						case "n": {
								var ptr = getNextArg("i32*");
								HEAP32[ptr >> 2] = ret.length;
								break
							};
						case "%": {
								ret.push(curr);
								break
							};
						default: {
								for (var i = startTextIndex; i < textIndex + 2; i++) {
									ret.push(HEAP8[i >> 0])
								}
							}
						}
						textIndex += 2
					} else {
						ret.push(curr);
						textIndex += 1
					}
				}
				return ret
			}
			function _fprintf(stream, format, varargs) {
				var result = __formatString(format, varargs);
				var stack = Runtime.stackSave();
				var ret = _fwrite(allocate(result, "i8", ALLOC_STACK), 1, result.length, stream);
				Runtime.stackRestore(stack);
				return ret
			}
			function _printf(format, varargs) {
				var stdout = HEAP32[_stdout >> 2];
				return _fprintf(stdout, format, varargs)
			}
			function _emscripten_memcpy_big(dest, src, num) {
				HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
				return dest
			}
			Module["_memcpy"] = _memcpy;
			function _fputs(s, stream) {
				var fd = _fileno(stream);
				return _write(fd, s, _strlen(s))
			}
			function _fputc(c, stream) {
				var chr = unSign(c & 255);
				HEAP8[_fputc.ret >> 0] = chr;
				var fd = _fileno(stream);
				var ret = _write(fd, _fputc.ret, 1);
				if (ret == -1) {
					var streamObj = FS.getStreamFromPtr(stream);
					if (streamObj)
						streamObj.error = true;
					return -1
				} else {
					return chr
				}
			}
			function _puts(s) {
				var stdout = HEAP32[_stdout >> 2];
				var ret = _fputs(s, stdout);
				if (ret < 0) {
					return ret
				} else {
					var newlineRet = _fputc(10, stdout);
					return newlineRet < 0 ? -1 : ret + 1
				}
			}
			function _strerror_r(errnum, strerrbuf, buflen) {
				if (errnum in ERRNO_MESSAGES) {
					if (ERRNO_MESSAGES[errnum].length > buflen - 1) {
						return ___setErrNo(ERRNO_CODES.ERANGE)
					} else {
						var msg = ERRNO_MESSAGES[errnum];
						writeAsciiToMemory(msg, strerrbuf);
						return 0
					}
				} else {
					return ___setErrNo(ERRNO_CODES.EINVAL)
				}
			}
			function _strerror(errnum) {
				if (!_strerror.buffer)
					_strerror.buffer = _malloc(256);
				_strerror_r(errnum, _strerror.buffer, 256);
				return _strerror.buffer
			}
			function ___errno_location() {
				return ___errno_state
			}
			function _perror(s) {
				var stdout = HEAP32[_stdout >> 2];
				if (s) {
					_fputs(s, stdout);
					_fputc(58, stdout);
					_fputc(32, stdout)
				}
				var errnum = HEAP32[___errno_location() >> 2];
				_puts(_strerror(errnum))
			}
			function _llvm_stackrestore(p) {
				var self = _llvm_stacksave;
				var ret = self.LLVM_SAVEDSTACKS[p];
				self.LLVM_SAVEDSTACKS.splice(p, 1);
				Runtime.stackRestore(ret)
			}
			var _fabs = Math_abs;
			function _llvm_stacksave() {
				var self = _llvm_stacksave;
				if (!self.LLVM_SAVEDSTACKS) {
					self.LLVM_SAVEDSTACKS = []
				}
				self.LLVM_SAVEDSTACKS.push(Runtime.stackSave());
				return self.LLVM_SAVEDSTACKS.length - 1
			}
			Module["_memmove"] = _memmove;
			var _emscripten_asm_const_int = true;
			function _sbrk(bytes) {
				var self = _sbrk;
				if (!self.called) {
					DYNAMICTOP = alignMemoryPage(DYNAMICTOP);
					self.called = true;
					assert(Runtime.dynamicAlloc);
					self.alloc = Runtime.dynamicAlloc;
					Runtime.dynamicAlloc = (function () {
						abort("cannot dynamically allocate, sbrk now has control")
					})
				}
				var ret = DYNAMICTOP;
				if (bytes != 0) {
					var success = self.alloc(bytes);
					if (!success)
						return -1 >>> 0
				}
				return ret
			}
			function _time(ptr) {
				var ret = Date.now() / 1e3 | 0;
				if (ptr) {
					HEAP32[ptr >> 2] = ret
				}
				return ret
			}
			___errno_state = Runtime.staticAlloc(4);
			HEAP32[___errno_state >> 2] = 0;
			FS.staticInit();
			__ATINIT__.unshift((function () {
					if (!Module["noFSInit"] && !FS.init.initialized)
						FS.init()
				}));
			__ATMAIN__.push((function () {
					FS.ignorePermissions = false
				}));
			__ATEXIT__.push((function () {
					FS.quit()
				}));
			Module["FS_createFolder"] = FS.createFolder;
			Module["FS_createPath"] = FS.createPath;
			Module["FS_createDataFile"] = FS.createDataFile;
			Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
			Module["FS_createLazyFile"] = FS.createLazyFile;
			Module["FS_createLink"] = FS.createLink;
			Module["FS_createDevice"] = FS.createDevice;
			__ATINIT__.unshift((function () {
					TTY.init()
				}));
			__ATEXIT__.push((function () {
					TTY.shutdown()
				}));
			if (ENVIRONMENT_IS_NODE) {
				var fs = require("fs");
				var NODEJS_PATH = require("path");
				NODEFS.staticInit()
			}
			__ATINIT__.push((function () {
					SOCKFS.root = FS.mount(SOCKFS, {}, null)
				}));
			_fputc.ret = allocate([0], "i8", ALLOC_STATIC);
			STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
			staticSealed = true;
			STACK_MAX = STACK_BASE + TOTAL_STACK;
			DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
			assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");
			function invoke_viiii(index, a1, a2, a3, a4) {
				try {
					Module["dynCall_viiii"](index, a1, a2, a3, a4)
				} catch (e) {
					if (typeof e !== "number" && e !== "longjmp")
						throw e;
					asm["setThrew"](1, 0)
				}
			}
			Module.asmGlobalArg = {
				"Math": Math,
				"Int8Array": Int8Array,
				"Int16Array": Int16Array,
				"Int32Array": Int32Array,
				"Uint8Array": Uint8Array,
				"Uint16Array": Uint16Array,
				"Uint32Array": Uint32Array,
				"Float32Array": Float32Array,
				"Float64Array": Float64Array,
				"NaN": NaN,
				"Infinity": Infinity
			};
			Module.asmLibraryArg = {
				"abort": abort,
				"assert": assert,
				"invoke_viiii": invoke_viiii,
				"_fabs": _fabs,
				"_send": _send,
				"___setErrNo": ___setErrNo,
				"_llvm_stackrestore": _llvm_stackrestore,
				"_fflush": _fflush,
				"_pwrite": _pwrite,
				"_strerror_r": _strerror_r,
				"_fprintf": _fprintf,
				"__reallyNegative": __reallyNegative,
				"_sbrk": _sbrk,
				"_emscripten_memcpy_big": _emscripten_memcpy_big,
				"_fileno": _fileno,
				"_perror": _perror,
				"_sysconf": _sysconf,
				"_llvm_stacksave": _llvm_stacksave,
				"_puts": _puts,
				"_printf": _printf,
				"_emscripten_asm_const_15": _emscripten_asm_const_15,
				"_write": _write,
				"___errno_location": ___errno_location,
				"_fputc": _fputc,
				"_abort": _abort,
				"_fwrite": _fwrite,
				"_time": _time,
				"_mkport": _mkport,
				"_strerror": _strerror,
				"__formatString": __formatString,
				"_fputs": _fputs,
				"_emscripten_asm_const_1": _emscripten_asm_const_1,
				"STACKTOP": STACKTOP,
				"STACK_MAX": STACK_MAX,
				"tempDoublePtr": tempDoublePtr,
				"ABORT": ABORT
			}; // EMSCRIPTEN_START_ASM
			var asm = (function (global, env, buffer) {
				"use asm";
				var a = new global.Int8Array(buffer);
				var b = new global.Int16Array(buffer);
				var c = new global.Int32Array(buffer);
				var d = new global.Uint8Array(buffer);
				var e = new global.Uint16Array(buffer);
				var f = new global.Uint32Array(buffer);
				var g = new global.Float32Array(buffer);
				var h = new global.Float64Array(buffer);
				var i = env.STACKTOP | 0;
				var j = env.STACK_MAX | 0;
				var k = env.tempDoublePtr | 0;
				var l = env.ABORT | 0;
				var m = 0;
				var n = 0;
				var o = 0;
				var p = 0;
				var q = global.NaN,
				r = global.Infinity;
				var s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0.0,
				x = 0,
				y = 0,
				z = 0,
				A = 0.0;
				var B = 0;
				var C = 0;
				var D = 0;
				var E = 0;
				var F = 0;
				var G = 0;
				var H = 0;
				var I = 0;
				var J = 0;
				var K = 0;
				var L = global.Math.floor;
				var M = global.Math.abs;
				var N = global.Math.sqrt;
				var O = global.Math.pow;
				var P = global.Math.cos;
				var Q = global.Math.sin;
				var R = global.Math.tan;
				var S = global.Math.acos;
				var T = global.Math.asin;
				var U = global.Math.atan;
				var V = global.Math.atan2;
				var W = global.Math.exp;
				var X = global.Math.log;
				var Y = global.Math.ceil;
				var Z = global.Math.imul;
				var _ = global.Math.min;
				var $ = global.Math.clz32;
				var aa = env.abort;
				var ba = env.assert;
				var ca = env.invoke_viiii;
				var da = env._fabs;
				var ea = env._send;
				var fa = env.___setErrNo;
				var ga = env._llvm_stackrestore;
				var ha = env._fflush;
				var ia = env._pwrite;
				var ja = env._strerror_r;
				var ka = env._fprintf;
				var la = env.__reallyNegative;
				var ma = env._sbrk;
				var na = env._emscripten_memcpy_big;
				var oa = env._fileno;
				var pa = env._perror;
				var qa = env._sysconf;
				var ra = env._llvm_stacksave;
				var sa = env._puts;
				var ta = env._printf;
				var ua = env._emscripten_asm_const_15;
				var va = env._write;
				var wa = env.___errno_location;
				var xa = env._fputc;
				var ya = env._abort;
				var za = env._fwrite;
				var Aa = env._time;
				var Ba = env._mkport;
				var Ca = env._strerror;
				var Da = env.__formatString;
				var Ea = env._fputs;
				var Fa = env._emscripten_asm_const_1;
				var Ga = 0.0;
				// EMSCRIPTEN_START_FUNCS
				function Ia(a) {
					a = a | 0;
					var b = 0;
					b = i;
					i = i + a | 0;
					i = i + 15 & -16;
					return b | 0
				}
				function Ja() {
					return i | 0
				}
				function Ka(a) {
					a = a | 0;
					i = a
				}
				function La(a, b) {
					a = a | 0;
					b = b | 0;
					i = a;
					j = b
				}
				function Ma(a, b) {
					a = a | 0;
					b = b | 0;
					if (!m) {
						m = a;
						n = b
					}
				}
				function Na(b) {
					b = b | 0;
					a[k >> 0] = a[b >> 0];
					a[k + 1 >> 0] = a[b + 1 >> 0];
					a[k + 2 >> 0] = a[b + 2 >> 0];
					a[k + 3 >> 0] = a[b + 3 >> 0]
				}
				function Oa(b) {
					b = b | 0;
					a[k >> 0] = a[b >> 0];
					a[k + 1 >> 0] = a[b + 1 >> 0];
					a[k + 2 >> 0] = a[b + 2 >> 0];
					a[k + 3 >> 0] = a[b + 3 >> 0];
					a[k + 4 >> 0] = a[b + 4 >> 0];
					a[k + 5 >> 0] = a[b + 5 >> 0];
					a[k + 6 >> 0] = a[b + 6 >> 0];
					a[k + 7 >> 0] = a[b + 7 >> 0]
				}
				function Pa(a) {
					a = a | 0;
					B = a
				}
				function Qa() {
					return B | 0
				}
				function Ra(b, e) {
					b = b | 0;
					e = e | 0;
					var f = 0,
					g = 0,
					h = 0,
					j = 0,
					k = 0,
					l = 0,
					m = 0,
					n = 0,
					o = 0,
					p = 0,
					q = 0,
					r = 0,
					s = 0,
					t = 0,
					u = 0,
					v = 0,
					w = 0,
					x = 0,
					y = 0,
					z = 0,
					A = 0,
					B = 0,
					C = 0,
					D = 0,
					E = 0,
					F = 0,
					G = 0,
					H = 0,
					I = 0;
					I = i;
					i = i + 18080 | 0;
					E = I + 18008 | 0;
					F = I + 17944 | 0;
					G = I + 17880 | 0;
					D = I + 17816 | 0;
					C = I + 17800 | 0;
					H = I;
					k = b + 32 | 0;
					a: do
						if (!((c[k >> 2] | 0) + 3 & 3)) {
							Mb(e | 0, 0, 8916) | 0;
							Mb(H | 0, 0, 17800) | 0;
							A = c[k >> 2] | 0;
							c[e >> 2] = (A + -17 | 0) / 4 | 0;
							if ((A + -21 | 0) >>> 0 > 159)
								f = 2;
							else {
								if ((Sa(b, e, 0) | 0) != 0 ? (f = Sa(b, e, 1) | 0, (f | 0) != 0) : 0)
									break;
								A = c[k >> 2] | 0;
								g = A + -1 | 0;
								b: do
									if ((A | 0) > 1) {
										j = -1;
										f = g;
										l = g;
										while (1) {
											g = j;
											while (1) {
												f = (((f | 0) == 6) << 31 >> 31) + f | 0;
												h = c[e >> 2] | 0;
												if (!(Ta(h, l, f) | 0)) {
													Ua(b, e, H, l, f);
													h = c[e >> 2] | 0
												}
												j = f + -1 | 0;
												if (!(Ta(h, l, j) | 0))
													Ua(b, e, H, l, j);
												h = g + l | 0;
												if ((h | 0) >= 0 ? (h | 0) < (c[k >> 2] | 0) : 0)
													break;
												if ((f | 0) > 2) {
													g = 0 - g | 0;
													f = f + -2 | 0
												} else
													break b
											}
											if ((f | 0) > 0) {
												j = g;
												l = h
											} else
												break
										}
									}
								while (0);
								u = c[e >> 2] | 0;
								s = c[e + 4 >> 2] | 0;
								p = 1032 + (u * 80 | 0) + 32 + (s * 12 | 0) | 0;
								r = c[1032 + (u * 80 | 0) >> 2] | 0;
								v = c[p >> 2] | 0;
								q = (r | 0) / (v | 0) | 0;
								r = r - (Z(q, v) | 0) | 0;
								s = c[1032 + (u * 80 | 0) + 32 + (s * 12 | 0) + 4 >> 2] | 0;
								u = Z(s, q) | 0;
								c[C >> 2] = c[p >> 2];
								c[C + 4 >> 2] = c[p + 4 >> 2];
								c[C + 8 >> 2] = c[p + 8 >> 2];
								t = C + 4 | 0;
								c[t >> 2] = (c[t >> 2] | 0) + 1;
								c[C >> 2] = (c[C >> 2] | 0) + 1;
								t = u + r | 0;
								u = u - r | 0;
								A = (s | 0) > 0 ? s : 0;
								v = v - s | 0;
								w = A + 1 | 0;
								c: do
									if ((q | 0) > 0) {
										x = (s | 0) > 0;
										y = (v | 0) > 0;
										o = 0;
										z = 0;
										while (1) {
											if (x) {
												l = 0;
												do {
													a[l + o + (H + 8904) >> 0] = a[H + ((Z(l, q) | 0) + z) >> 0] | 0;
													l = l + 1 | 0
												} while ((l | 0) < (s | 0));
											}
											m = H + 8904 + o | 0;
											if ((z + r | 0) < (q | 0)) {
												n = p;
												l = A
											} else {
												a[o + A + (H + 8904) >> 0] = a[H + (u + z) >> 0] | 0;
												n = C;
												l = w
											}
											b = t + z | 0;
											if (y) {
												k = 0;
												while (1) {
													a[l + o + (H + 8904) >> 0] = a[H + (b + (Z(k, q) | 0)) >> 0] | 0;
													k = k + 1 | 0;
													if ((k | 0) >= (v | 0))
														break;
													else
														l = l + 1 | 0
												}
											}
											f = c[n + 8 >> 2] | 0;
											if (!(Va(m, c[n >> 2] | 0, f, E) | 0))
												f = 0;
											else {
												Wa(E, f, 8, F);
												l = G;
												k = l + 64 | 0;
												do {
													a[l >> 0] = 0;
													l = l + 1 | 0
												} while ((l | 0) < (k | 0));
												l = 1;
												k = 0;
												do {
													a[G + k >> 0] = a[F + l >> 0] | 0;
													k = k + 2 | 0;
													l = k | 1
												} while ((l | 0) < 64);
												l = D;
												k = l + 64 | 0;
												do {
													a[l >> 0] = 0;
													l = l + 1 | 0
												} while ((l | 0) < (k | 0));
												h = 0;
												g = 64;
												while (1) {
													if (g) {
														j = a[F + h >> 0] | 0;
														b = j << 24 >> 24 == 0;
														j = 24 + (j & 255) | 0;
														k = h;
														l = 0;
														while (1) {
															if (!b ? (B = a[E + l >> 0] | 0, B << 24 >> 24 != 0) : 0) {
																k = D + k | 0;
																a[k >> 0] = a[k >> 0] ^ a[280 + ((((d[24 + (B & 255) >> 0] | 0) + (d[j >> 0] | 0) | 0) >>> 0) % 255 | 0) >> 0]
															}
															l = l + 1 | 0;
															if ((l | 0) == (g | 0))
																break;
															else
																k = l + h | 0
														}
													}
													h = h + 1 | 0;
													if ((h | 0) == 64)
														break;
													else
														g = g + -1 | 0
												}
												Mb(D + f | 0, 0, 64 - f | 0) | 0;
												l = c[n >> 2] | 0;
												if ((l | 0) > 0) {
													b = 0;
													do {
														k = a[280 + (255 - b) >> 0] | 0;
														if (!((Xa(F, k, 8) | 0) << 24 >> 24)) {
															h = Xa(G, k, 8) | 0;
															j = Xa(D, k, 8) | 0;
															k = o + ~b + l + (H + 8904) | 0;
															a[k >> 0] = a[k >> 0] ^ a[280 + (((((d[24 + (h & 255) >> 0] | 0) ^ 255) + (d[24 + (j & 255) >> 0] | 0) | 0) >>> 0) % 255 | 0) >> 0]
														}
														b = b + 1 | 0
													} while ((l | 0) > (b | 0));
												}
												f = (Va(m, l, f, E) | 0) == 0;
												f = f ? 0 : 4
											}
											if (f)
												break;
											f = (c[n + 4 >> 2] | 0) + o | 0;
											z = z + 1 | 0;
											if ((z | 0) >= (q | 0))
												break c;
											else
												o = f
										}
										break a
									} else
										f = 0;
								while (0);
								G = f << 3;
								j = H + 8896 | 0;
								c[j >> 2] = G;
								h = H + 8900 | 0;
								l = e + 8912 | 0;
								b = e + 12 | 0;
								d: do
									if ((G - (c[h >> 2] | 0) | 0) > 3)
										do {
											k = Ya(H, 4) | 0;
											do
												if ((k | 0) == 1) {
													f = c[e >> 2] | 0;
													f = Ya(H, (f | 0) < 10 ? 10 : (f | 0) < 27 ? 12 : 14) | 0;
													if (((c[l >> 2] | 0) + f | 0) > 8895) {
														f = 6;
														break a
													}
													if ((f | 0) > 2)
														do {
															if ((Za(e, H, 10, 3) | 0) < 0) {
																f = 7;
																break a
															}
															f = f + -3 | 0
														} while ((f | 0) > 2);
													if ((f | 0) > 1)
														if ((Za(e, H, 7, 2) | 0) < 0) {
															f = 7;
															break a
														} else
															break;
													if ((f | 0) != 0 ? (Za(e, H, 4, 1) | 0) < 0 : 0) {
														f = 7;
														break a
													}
												} else if ((k | 0) == 2) {
													f = c[e >> 2] | 0;
													f = Ya(H, (f | 0) < 7 ? 9 : (f | 0) < 11 ? 10 : 13) | 0;
													if (((c[l >> 2] | 0) + f | 0) > 8895) {
														f = 6;
														break a
													}
													if ((f | 0) > 1)
														do {
															if ((_a(e, H, 11, 2) | 0) < 0) {
																f = 7;
																break a
															}
															f = f + -2 | 0
														} while ((f | 0) > 1);
													if ((f | 0) != 0 ? (_a(e, H, 6, 1) | 0) < 0 : 0) {
														f = 7;
														break a
													}
												} else if ((k | 0) == 4) {
													f = Ya(H, (c[e >> 2] | 0) < 10 ? 8 : 16) | 0;
													if (((c[l >> 2] | 0) + f | 0) > 8895) {
														f = 6;
														break a
													}
													if (((c[j >> 2] | 0) - (c[h >> 2] | 0) | 0) < (f << 3 | 0)) {
														f = 7;
														break a
													}
													if ((f | 0) > 0) {
														g = 0;
														do {
															F = (Ya(H, 8) | 0) & 255;
															G = c[l >> 2] | 0;
															c[l >> 2] = G + 1;
															a[e + 16 + G >> 0] = F;
															g = g + 1 | 0
														} while ((g | 0) < (f | 0));
													}
												} else if ((k | 0) == 8) {
													f = c[e >> 2] | 0;
													f = Ya(H, (f | 0) < 10 ? 8 : (f | 0) < 27 ? 10 : 12) | 0;
													if (((c[l >> 2] | 0) + (f << 1) | 0) > 8895) {
														f = 6;
														break a
													}
													if (((c[j >> 2] | 0) - (c[h >> 2] | 0) | 0) < (f * 13 | 0)) {
														f = 7;
														break a
													}
													if ((f | 0) > 0) {
														g = 0;
														do {
															F = Ya(H, 13) | 0;
															G = F + 33088 | 0;
															F = (G | 0) > 40955 ? G : F + 49472 | 0;
															G = c[l >> 2] | 0;
															c[l >> 2] = G + 1;
															a[e + 16 + G >> 0] = F >>> 8;
															G = c[l >> 2] | 0;
															c[l >> 2] = G + 1;
															a[e + 16 + G >> 0] = F;
															g = g + 1 | 0
														} while ((g | 0) < (f | 0));
													}
												} else
													break d;
											while (0);
											if ((k | 0) > (c[b >> 2] | 0))
												c[b >> 2] = k
										} while (((c[j >> 2] | 0) - (c[h >> 2] | 0) | 0) > 3);
								while (0);
								f = c[l >> 2] | 0;
								if (f >>> 0 > 8895) {
									f = f + -1 | 0;
									c[l >> 2] = f
								}
								a[e + 16 + f >> 0] = 0;
								f = 0
							}
						} else
							f = 1;
					while (0);
					i = I;
					return f | 0
				}
				function Sa(b, e, f) {
					b = b | 0;
					e = e | 0;
					f = f | 0;
					var g = 0,
					h = 0,
					j = 0,
					k = 0,
					l = 0,
					m = 0,
					n = 0,
					o = 0;
					n = i;
					i = i + 128 | 0;
					l = n + 64 | 0;
					k = n;
					j = b + 32 | 0;
					h = c[j >> 2] | 0;
					if (!f) {
						g = 0;
						f = 14;
						while (1) {
							j = (Z(h, c[648 + (f << 2) >> 2] | 0) | 0) + (c[584 + (f << 2) >> 2] | 0) | 0;
							g = (d[(j >> 3) + (b + 36) >> 0] | 0) >>> (j & 7) & 1 | g << 1 & 131070;
							if ((f | 0) > 0)
								f = f + -1 | 0;
							else
								break
						}
					} else {
						g = 0;
						f = 0;
						do {
							o = (Z(h + ~f | 0, h) | 0) + 8 | 0;
							g = (d[(o >> 3) + (b + 36) >> 0] | 0) >>> (o & 7) & 1 | g << 1 & 131070;
							f = f + 1 | 0
						} while ((f | 0) != 7);
						h = c[j >> 2] | 0;
						j = h << 3;
						f = 0;
						do {
							o = f + -8 + h + j | 0;
							g = (d[(o >> 3) + (b + 36) >> 0] | 0) >>> (o & 7) & 1 | g << 1 & 131070;
							f = f + 1 | 0
						} while ((f | 0) != 8);
					}
					g = (g ^ 21522) & 65535;
					if (ab(g, l) | 0) {
						Wa(l, 6, 712, k);
						f = 0;
						do {
							if (!((Xa(k, a[728 + (15 - f) >> 0] | 0, 712) | 0) << 24 >> 24))
								g = (1 << f ^ g & 65535) & 65535;
							f = f + 1 | 0
						} while ((f | 0) != 15);
						if (!(ab(g, l) | 0))
							m = 13;
						else
							g = 3
					} else
						m = 13;
					if ((m | 0) == 13) {
						g = (g & 65535) >>> 10 & 65535;
						c[e + 4 >> 2] = g >>> 3;
						c[e + 8 >> 2] = g & 7;
						g = 0
					}
					i = n;
					return g | 0
				}
				function Ta(a, b, d) {
					a = a | 0;
					b = b | 0;
					d = d | 0;
					var e = 0,
					f = 0,
					g = 0,
					h = 0,
					i = 0;
					g = a << 2;
					f = (b | 0) < 9;
					e = (d | 0) < 9;
					do
						if (((!(f & e) ? (h = g + 9 | 0, !((h | 0) <= (b | 0) & e)) : 0) ? (h | 0) > (d | 0) | f ^ 1 : 0) ? !((b | 0) == 6 | (d | 0) == 6) : 0) {
							if ((a | 0) > 6) {
								e = g + 6 | 0;
								if (!((b | 0) > 5 | (e | 0) > (d | 0))) {
									e = 1;
									break
								}
								if ((e | 0) <= (b | 0) & (d | 0) < 6) {
									e = 1;
									break
								} else {
									e = 0;
									g = -1;
									f = -1
								}
							} else {
								e = 0;
								g = -1;
								f = -1
							}
							do {
								h = c[1032 + (a * 80 | 0) + 4 + (e << 2) >> 2] | 0;
								if (!h)
									break;
								i = h - b | 0;
								g = (((i | 0) > -1 ? i : 0 - i | 0) | 0) < 3 ? e : g;
								h = h - d | 0;
								f = (((h | 0) > -1 ? h : 0 - h | 0) | 0) < 3 ? e : f;
								e = e + 1 | 0
							} while ((e | 0) < 7);
							if ((f | g | 0) > -1) {
								e = e + -1 | 0;
								if ((g | 0) > 0 & (g | 0) < (e | 0)) {
									e = 1;
									break
								}
								if ((f | 0) > 0 & (f | 0) < (e | 0)) {
									e = 1;
									break
								}
								if ((f | 0) == (e | 0) & (g | 0) == (e | 0)) {
									e = 1;
									break
								}
							}
							e = 0
						} else
							e = 1;
					while (0);
					return e | 0
				}
				function Ua(b, e, f, g, h) {
					b = b | 0;
					e = e | 0;
					f = f | 0;
					g = g | 0;
					h = h | 0;
					var i = 0,
					j = 0,
					k = 0,
					l = 0,
					m = 0,
					n = 0,
					o = 0;
					n = f + 8896 | 0;
					i = c[n >> 2] | 0;
					l = i & 7;
					m = i >> 3;
					k = (Z(c[b + 32 >> 2] | 0, g) | 0) + h | 0;
					j = d[(k >> 3) + (b + 36) >> 0] | 0;
					k = k & 7;
					switch (c[e + 8 >> 2] | 0) {
					case 0: {
							b = h + g & 1 ^ 1;
							o = 11;
							break
						}
					case 1: {
							b = g & 1 ^ 1;
							o = 11;
							break
						}
					case 2: {
							b = ((h | 0) % 3 | 0 | 0) == 0 & 1;
							o = 11;
							break
						}
					case 3: {
							b = ((h + g | 0) % 3 | 0 | 0) == 0 & 1;
							o = 11;
							break
						}
					case 4: {
							b = ((h | 0) / 3 | 0) + ((g | 0) / 2 | 0) & 1 ^ 1;
							o = 11;
							break
						}
					case 6: {
							b = Z(h, g) | 0;
							b = ((b | 0) % 3 | 0) + b & 1 ^ 1;
							o = 11;
							break
						}
					case 5: {
							b = Z(h, g) | 0;
							b = ((b | 0) % 2 | 0 | 0) == (0 - ((b | 0) % 3 | 0) | 0) & 1;
							o = 11;
							break
						}
					case 7: {
							b = h + g + ((Z(h, g) | 0) % 3 | 0) & 1 ^ 1;
							o = 11;
							break
						}
					default:
						if (1 << k & j)
							o = 12
					}
					if ((o | 0) == 11)
						if ((1 << k & j | 0) != 0 ^ (b | 0) != 0)
							o = 12;
					if ((o | 0) == 12) {
						i = f + m | 0;
						a[i >> 0] = d[i >> 0] | 0 | 128 >>> l;
						i = c[n >> 2] | 0
					}
					c[n >> 2] = i + 1;
					return
				}
				function Va(b, c, e, f) {
					b = b | 0;
					c = c | 0;
					e = e | 0;
					f = f | 0;
					var g = 0,
					h = 0,
					i = 0,
					j = 0,
					k = 0,
					l = 0,
					m = 0;
					g = f;
					h = g + 64 | 0;
					do {
						a[g >> 0] = 0;
						g = g + 1 | 0
					} while ((g | 0) < (h | 0));
					k = c + -1 | 0;
					if ((e | 0) > 0) {
						l = (c | 0) > 0;
						m = 0;
						g = 0;
						do {
							h = f + m | 0;
							m = m + 1 | 0;
							if (l) {
								j = 0;
								do {
									i = a[b + (k - j) >> 0] | 0;
									if (i << 24 >> 24) {
										i = a[280 + (((d[24 + (i & 255) >> 0] | 0) + (Z(j, m) | 0) | 0) % 255 | 0) >> 0] | 0;
										a[h >> 0] = a[h >> 0] ^ i
									}
									j = j + 1 | 0
								} while ((j | 0) < (c | 0));
							}
							g = (a[h >> 0] | 0) == 0 ? g : 1
						} while ((m | 0) < (e | 0));
					} else
						g = 0;
					return g | 0
				}
				function Wa(b, e, f, g) {
					b = b | 0;
					e = e | 0;
					f = f | 0;
					g = g | 0;
					var h = 0,
					j = 0,
					k = 0,
					l = 0,
					m = 0,
					n = 0,
					o = 0,
					p = 0,
					q = 0,
					r = 0,
					s = 0,
					t = 0,
					u = 0,
					v = 0,
					w = 0;
					w = i;
					i = i + 192 | 0;
					t = w + 128 | 0;
					s = w + 64 | 0;
					u = w;
					l = s;
					m = l + 64 | 0;
					do {
						a[l >> 0] = 0;
						l = l + 1 | 0
					} while ((l | 0) < (m | 0));
					l = t;
					m = l + 64 | 0;
					do {
						a[l >> 0] = 0;
						l = l + 1 | 0
					} while ((l | 0) < (m | 0));
					a[s >> 0] = 1;
					a[t >> 0] = 1;
					p = f + 4 | 0;
					q = f + 8 | 0;
					if ((e | 0) > 0) {
						o = 0;
						m = 1;
						j = 1;
						v = 0;
						while (1) {
							h = a[b + v >> 0] | 0;
							if ((o | 0) >= 1) {
								l = 1;
								while (1) {
									n = a[t + l >> 0] | 0;
									k = n & 255;
									if (n << 24 >> 24 != 0 ? (r = a[b + (v - l) >> 0] | 0, r << 24 >> 24 != 0) : 0) {
										n = c[p >> 2] | 0;
										h = a[(c[q >> 2] | 0) + (((d[n + (r & 255) >> 0] | 0) + (d[n + k >> 0] | 0) | 0) % (c[f >> 2] | 0) | 0) >> 0] ^ h
									}
									if ((l | 0) < (o | 0))
										l = l + 1 | 0;
									else
										break
								}
							}
							n = c[f >> 2] | 0;
							l = c[p >> 2] | 0;
							n = a[(c[q >> 2] | 0) + ((n - (d[l + (m & 255) >> 0] | 0) + (d[l + (h & 255) >> 0] | 0) | 0) % (n | 0) | 0) >> 0] | 0;
							do
								if (h << 24 >> 24)
									if ((o << 1 | 0) > (v | 0)) {
										$a(t, s, n, j, f);
										k = o;
										h = m;
										j = j + 1 | 0;
										break
									} else {
										l = u;
										k = t;
										m = l + 64 | 0;
										do {
											a[l >> 0] = a[k >> 0] | 0;
											l = l + 1 | 0;
											k = k + 1 | 0
										} while ((l | 0) < (m | 0));
										$a(t, s, n, j, f);
										l = s;
										k = u;
										m = l + 64 | 0;
										do {
											a[l >> 0] = a[k >> 0] | 0;
											l = l + 1 | 0;
											k = k + 1 | 0
										} while ((l | 0) < (m | 0));
										k = v + 1 - o | 0;
										j = 1;
										break
									}
								else {
									k = o;
									h = m;
									j = j + 1 | 0
								}
							while (0);
							v = v + 1 | 0;
							if ((v | 0) >= (e | 0))
								break;
							else {
								o = k;
								m = h
							}
						}
					}
					l = g;
					k = t;
					m = l + 64 | 0;
					do {
						a[l >> 0] = a[k >> 0] | 0;
						l = l + 1 | 0;
						k = k + 1 | 0
					} while ((l | 0) < (m | 0));
					i = w;
					return
				}
				function Xa(b, e, f) {
					b = b | 0;
					e = e | 0;
					f = f | 0;
					var g = 0,
					h = 0,
					i = 0,
					j = 0,
					k = 0;
					if (!(e << 24 >> 24))
						e = a[b >> 0] | 0;
					else {
						k = c[f + 4 >> 2] | 0;
						h = d[k + (e & 255) >> 0] | 0;
						i = f + 8 | 0;
						j = 0;
						e = 0;
						do {
							g = a[b + j >> 0] | 0;
							if (g << 24 >> 24) {
								g = (d[k + (g & 255) >> 0] | 0) + (Z(j, h) | 0) | 0;
								e = a[(c[i >> 2] | 0) + ((g | 0) % (c[f >> 2] | 0) | 0) >> 0] ^ e
							}
							j = j + 1 | 0
						} while ((j | 0) != 64);
					}
					return e | 0
				}
				function Ya(a, b) {
					a = a | 0;
					b = b | 0;
					var e = 0,
					f = 0,
					g = 0,
					h = 0;
					g = a + 8900 | 0;
					h = a + 8896 | 0;
					a: do
						if (!b)
							b = 0;
						else {
							e = b;
							b = 0;
							do {
								f = c[g >> 2] | 0;
								if ((f | 0) >= (c[h >> 2] | 0))
									break a;
								b = ((d[(f >> 3) + (a + 8904) >> 0] | 0) & 128 >>> (f & 7) | 0) != 0 | b << 1;
								c[g >> 2] = f + 1;
								e = e + -1 | 0
							} while ((e | 0) != 0);
						}
					while (0);
					return b | 0
				}
				function Za(b, d, e, f) {
					b = b | 0;
					d = d | 0;
					e = e | 0;
					f = f | 0;
					var g = 0,
					h = 0;
					if (((c[d + 8896 >> 2] | 0) - (c[d + 8900 >> 2] | 0) | 0) < (e | 0))
						e = -1;
					else {
						d = Ya(d, e) | 0;
						e = b + 8912 | 0;
						if ((f | 0) > 0) {
							g = f;
							while (1) {
								h = g;
								g = g + -1 | 0;
								a[(c[e >> 2] | 0) + g + (b + 16) >> 0] = ((d | 0) % 10 | 0) + 48;
								if ((h | 0) <= 1)
									break;
								else
									d = (d | 0) / 10 | 0
							}
						}
						c[e >> 2] = (c[e >> 2] | 0) + f;
						e = 0
					}
					return e | 0
				}
				function _a(b, d, e, f) {
					b = b | 0;
					d = d | 0;
					e = e | 0;
					f = f | 0;
					var g = 0,
					h = 0;
					if (((c[d + 8896 >> 2] | 0) - (c[d + 8900 >> 2] | 0) | 0) < (e | 0))
						e = -1;
					else {
						d = Ya(d, e) | 0;
						e = b + 8912 | 0;
						g = f + -1 | 0;
						if ((f | 0) > 0) {
							h = 0;
							while (1) {
								a[g - h + (c[e >> 2] | 0) + (b + 16) >> 0] = a[536 + ((d | 0) % 45 | 0) >> 0] | 0;
								h = h + 1 | 0;
								if ((h | 0) >= (f | 0))
									break;
								else
									d = (d | 0) / 45 | 0
							}
						}
						c[e >> 2] = (c[e >> 2] | 0) + f;
						e = 0
					}
					return e | 0
				}
				function $a(b, e, f, g, h) {
					b = b | 0;
					e = e | 0;
					f = f | 0;
					g = g | 0;
					h = h | 0;
					var i = 0,
					j = 0,
					k = 0,
					l = 0,
					m = 0;
					l = h + 4 | 0;
					m = d[(c[l >> 2] | 0) + (f & 255) >> 0] | 0;
					if (f << 24 >> 24) {
						i = h + 8 | 0;
						k = 0;
						do {
							j = k + g | 0;
							f = a[e + k >> 0] | 0;
							if (j >>> 0 < 64 & f << 24 >> 24 != 0) {
								j = b + j | 0;
								a[j >> 0] = a[j >> 0] ^ a[(c[i >> 2] | 0) + (((d[(c[l >> 2] | 0) + (f & 255) >> 0] | 0) + m | 0) % (c[h >> 2] | 0) | 0) >> 0]
							}
							k = k + 1 | 0
						} while ((k | 0) != 64);
					}
					return
				}
				function ab(b, c) {
					b = b | 0;
					c = c | 0;
					var d = 0,
					e = 0,
					f = 0,
					g = 0,
					h = 0;
					d = c;
					e = d + 64 | 0;
					do {
						a[d >> 0] = 0;
						d = d + 1 | 0
					} while ((d | 0) < (e | 0));
					g = b & 65535;
					h = 0;
					b = 0;
					do {
						d = c + h | 0;
						a[d >> 0] = 0;
						h = h + 1 | 0;
						e = 0;
						f = 0;
						do {
							if (1 << f & g) {
								e = e ^ a[728 + ((Z(f, h) | 0) % 15 | 0) >> 0];
								a[d >> 0] = e
							}
							f = f + 1 | 0
						} while ((f | 0) != 15);
						b = e << 24 >> 24 == 0 ? b : 1
					} while ((h | 0) != 6);
					return b | 0
				}
				function bb(a, b, d) {
					a = a | 0;
					b = b | 0;
					d = d | 0;
					c[a + 12 >> 2] = 2;
					c[a + 4080 >> 2] = 0;
					c[a + 7928 >> 2] = 0;
					if (b)
						c[b >> 2] = c[a + 4 >> 2];
					if (d)
						c[d >> 2] = c[a + 8 >> 2];
					return c[a >> 2] | 0
				}
				function cb(b) {
					b = b | 0;
					var d = 0,
					e = 0,
					f = 0,
					g = 0,
					j = 0,
					k = 0,
					l = 0.0,
					m = 0.0,
					n = 0,
					o = 0,
					p = 0,
					q = 0,
					r = 0,
					s = 0,
					t = 0,
					u = 0,
					v = 0,
					w = 0,
					x = 0,
					y = 0,
					z = 0,
					A = 0,
					B = 0,
					C = 0,
					D = 0,
					E = 0,
					F = 0,
					G = 0,
					H = 0,
					I = 0,
					J = 0,
					K = 0,
					L = 0,
					N = 0.0,
					O = 0,
					P = 0,
					Q = 0,
					R = 0,
					S = 0,
					T = 0,
					U = 0,
					V = 0,
					W = 0,
					X = 0,
					Y = 0,
					_ = 0,
					$ = 0,
					aa = 0,
					ba = 0,
					ca = 0,
					da = 0,
					ea = 0,
					fa = 0,
					ga = 0,
					ha = 0,
					ia = 0,
					ja = 0,
					ka = 0,
					la = 0,
					ma = 0,
					na = 0,
					oa = 0,
					pa = 0,
					qa = 0,
					ra = 0,
					sa = 0,
					ta = 0,
					ua = 0,
					va = 0,
					wa = 0,
					xa = 0,
					ya = 0,
					za = 0,
					Aa = 0,
					Ba = 0,
					Ca = 0,
					Da = 0,
					Ea = 0,
					Fa = 0;
					Fa = i;
					i = i + 1216 | 0;
					ua = Fa;
					va = Fa + 600 | 0;
					wa = Fa + 1200 | 0;
					Aa = Fa + 632 | 0;
					Ca = Fa + 1160 | 0;
					ya = Fa + 1168 | 0;
					xa = Fa + 80 | 0;
					Da = Fa + 640 | 0;
					za = Fa + 64 | 0;
					Ba = Fa + 72 | 0;
					eb(b);
					q = b + 8 | 0;
					r = b + 4 | 0;
					w = va + 4 | 0;
					x = va + 16 | 0;
					y = va + 12 | 0;
					B = va + 8 | 0;
					ta = b + 4080 | 0;
					C = ua + 24 | 0;
					D = ua + 8 | 0;
					G = ua + 4 | 0;
					s = ua + 16 | 0;
					u = ua + 12 | 0;
					v = ua + 20 | 0;
					if ((c[q >> 2] | 0) > 0) {
						J = 0;
						do {
							z = c[b >> 2] | 0;
							ia = c[r >> 2] | 0;
							A = Z(ia, J) | 0;
							c[va >> 2] = 0;
							c[va + 4 >> 2] = 0;
							c[va + 8 >> 2] = 0;
							c[va + 12 >> 2] = 0;
							c[va + 16 >> 2] = 0;
							if ((ia | 0) > 0) {
								d = 0;
								K = 0;
								g = 0;
								L = 0;
								while (1) {
									f = (a[z + (L + A) >> 0] | 0) != 0;
									ia = K;
									K = f & 1;
									if (!((L | 0) == 0 | (K | 0) == (ia | 0))) {
										Pb(va | 0, w | 0, 16) | 0;
										c[x >> 2] = d;
										e = g + 1 | 0;
										if ((g | 0) > 3 & (f ^ 1)) {
											n = c[va >> 2] | 0;
											o = c[w >> 2] | 0;
											p = c[y >> 2] | 0;
											f = (n + d + o + p | 0) / 4 | 0;
											j = (f * 3 | 0) / 4 | 0;
											k = 0;
											g = 1;
											do {
												ha = c[va + (k << 2) >> 2] | 0;
												ia = Z(c[760 + (k << 2) >> 2] | 0, f) | 0;
												g = (ha | 0) < (ia - j | 0) | (ha | 0) > (ia + j | 0) ? 0 : g;
												k = k + 1 | 0
											} while ((k | 0) != 5);
											if ((((((g | 0) != 0 ? (ia = L - d | 0, E = fb(b, ia, J) | 0, ia = ia - p - (c[B >> 2] | 0) | 0, F = fb(b, ia, J) | 0, ia = fb(b, ia - (o + n) | 0, J) | 0, !((ia | 0) == (F | 0) | ((ia | 0) != (E | 0) | (F | E | ia | 0) < 0))) : 0) ? (H = b + 16 + (F << 4) + 12 | 0, (c[H >> 2] | 0) <= -1) : 0) ? (I = b + 16 + (E << 4) + 12 | 0, (c[I >> 2] | 0) <= -1) : 0) ? ((((c[b + 16 + (F << 4) + 8 >> 2] | 0) * 100 | 0) / (c[b + 16 + (E << 4) + 8 >> 2] | 0) | 0) + -10 | 0) >>> 0 <= 60 : 0) ? (t = c[ta >> 2] | 0, (t | 0) <= 31) : 0) {
												c[ta >> 2] = t + 1;
												d = b + 4088 + (t * 120 | 0) | 0;
												o = d;
												n = o + 120 | 0;
												do {
													c[o >> 2] = 0;
													o = o + 4 | 0
												} while ((o | 0) < (n | 0));
												c[b + 4088 + (t * 120 | 0) + 112 >> 2] = -1;
												c[d >> 2] = E;
												c[b + 4088 + (t * 120 | 0) + 4 >> 2] = F;
												c[H >> 2] = t;
												c[I >> 2] = t;
												ia = b + 4088 + (t * 120 | 0) + 8 | 0;
												c[ua >> 2] = 0;
												c[ua + 4 >> 2] = 0;
												c[ua + 8 >> 2] = 0;
												c[ua + 12 >> 2] = 0;
												c[ua + 16 >> 2] = 0;
												c[ua + 20 >> 2] = 0;
												c[C >> 2] = ia;
												fa = b + 16 + (F << 4) | 0;
												d = c[fa + 4 >> 2] | 0;
												ha = ua;
												c[ha >> 2] = c[fa >> 2];
												c[ha + 4 >> 2] = d;
												c[D >> 2] = -1;
												ha = b + 16 + (E << 4) | 0;
												d = b + 16 + (E << 4) + 4 | 0;
												hb(b, c[ha >> 2] | 0, c[d >> 2] | 0, E, 1, 1, ua, 0);
												fa = c[C >> 2] | 0;
												c[ua >> 2] = (c[fa >> 2] | 0) - (c[ua >> 2] | 0);
												c[G >> 2] = (c[fa + 4 >> 2] | 0) - (c[G >> 2] | 0);
												fa = ha;
												ea = c[fa + 4 >> 2] | 0;
												ga = c[C >> 2] | 0;
												c[ga >> 2] = c[fa >> 2];
												c[ga + 4 >> 2] = ea;
												ga = ha;
												ea = c[ga + 4 >> 2] | 0;
												fa = (c[C >> 2] | 0) + 8 | 0;
												c[fa >> 2] = c[ga >> 2];
												c[fa + 4 >> 2] = ea;
												fa = ha;
												ea = c[fa + 4 >> 2] | 0;
												ga = (c[C >> 2] | 0) + 16 | 0;
												c[ga >> 2] = c[fa >> 2];
												c[ga + 4 >> 2] = ea;
												ga = ha;
												ea = c[ga + 4 >> 2] | 0;
												fa = (c[C >> 2] | 0) + 24 | 0;
												c[fa >> 2] = c[ga >> 2];
												c[fa + 4 >> 2] = ea;
												ha = c[ha >> 2] | 0;
												fa = c[ua >> 2] | 0;
												ea = Z(fa, ha) | 0;
												d = c[d >> 2] | 0;
												ga = c[G >> 2] | 0;
												ea = (Z(ga, d) | 0) + ea | 0;
												c[D >> 2] = ea;
												c[s >> 2] = 0 - ea;
												ga = (Z(d, fa) | 0) - (Z(ga, ha) | 0) | 0;
												c[u >> 2] = ga;
												c[v >> 2] = 0 - ga;
												hb(b, ha, d, 1, E, 2, ua, 0);
												d = b + 4088 + (t * 120 | 0) + 48 | 0;
												jb(d, ia, 7.0, 7.0);
												kb(d, 3.5, 3.5, b + 4088 + (t * 120 | 0) + 40 | 0);
												d = 0
											} else
												d = 0
										} else
											d = 0
									} else
										e = g;
									L = L + 1 | 0;
									if ((L | 0) >= (c[r >> 2] | 0))
										break;
									else {
										d = d + 1 | 0;
										g = e
									}
								}
							}
							J = J + 1 | 0
						} while ((J | 0) < (c[q >> 2] | 0));
					}
					r = xa + 512 | 0;
					D = Da + 512 | 0;
					e = b + 7928 | 0;
					q = wa + 4 | 0;
					C = va + 4 | 0;
					d = ua + 4 | 0;
					O = ya + 24 | 0;
					P = ya + 8 | 0;
					Q = va + 8 | 0;
					R = va + 16 | 0;
					S = va + 24 | 0;
					g = c[ta >> 2] | 0;
					if ((g | 0) > 0) {
						T = va + 8 | 0;
						U = va + 16 | 0;
						V = va + 24 | 0;
						W = ua + 8 | 0;
						X = ua + 16 | 0;
						Y = ua + 24 | 0;
						_ = ua + 32 | 0;
						$ = ua + 40 | 0;
						aa = ua + 48 | 0;
						ba = ua + 56 | 0;
						ca = ua + 8 | 0;
						da = ua + 16 | 0;
						ea = ua + 24 | 0;
						fa = ua + 32 | 0;
						ga = ua + 40 | 0;
						ha = ua + 48 | 0;
						ia = ua + 56 | 0;
						f = 0;
						do {
							if ((c[b + 4088 + (f * 120 | 0) + 112 >> 2] | 0) <= -1) {
								c[r >> 2] = 0;
								c[D >> 2] = 0;
								o = b + 4088 + (f * 120 | 0) + 48 | 0;
								if ((g | 0) > 0) {
									p = 0;
									do {
										if ((p | 0) != (f | 0) ? (c[b + 4088 + (p * 120 | 0) + 112 >> 2] | 0) <= -1 : 0) {
											lb(o, b + 4088 + (p * 120 | 0) + 40 | 0, za, Ba);
											l = +M( + (+h[za >> 3] + -3.5));
											h[za >> 3] = l;
											m = +M( + (+h[Ba >> 3] + -3.5));
											h[Ba >> 3] = m;
											if (l < m * .2) {
												L = c[r >> 2] | 0;
												c[r >> 2] = L + 1;
												c[xa + (L << 4) >> 2] = p;
												h[xa + (L << 4) + 8 >> 3] = m
											}
											if (m < l * .2) {
												L = c[D >> 2] | 0;
												c[D >> 2] = L + 1;
												c[Da + (L << 4) >> 2] = p;
												h[Da + (L << 4) + 8 >> 3] = l
											}
										}
										p = p + 1 | 0
									} while ((p | 0) < (c[ta >> 2] | 0));
								}
								J = c[r >> 2] | 0;
								I = c[D >> 2] | 0;
								if (!((J | 0) == 0 | (I | 0) == 0)) {
									if ((J | 0) > 0) {
										H = (I | 0) > 0;
										o = -1;
										m = 0.0;
										p = -1;
										G = 0;
										do {
											K = xa + (G << 4) | 0;
											if (H) {
												N = +h[xa + (G << 4) + 8 >> 3];
												l = m;
												L = 0;
												while (1) {
													m = +M( + (1.0 - N / +h[Da + (L << 4) + 8 >> 3]));
													if (!(m > 2.5) ? (o | 0) < 0 | m < l : 0) {
														o = c[K >> 2] | 0;
														p = c[Da + (L << 4) >> 2] | 0
													} else
														m = l;
													L = L + 1 | 0;
													if ((L | 0) >= (I | 0))
														break;
													else
														l = m
												}
											}
											G = G + 1 | 0
										} while ((G | 0) < (J | 0));
									} else {
										o = -1;
										p = -1
									}
									if ((p | o | 0) >= 0) {
										g = c[e >> 2] | 0;
										do
											if ((g | 0) <= 7) {
												A = b + 4088 + (o * 120 | 0) + 40 | 0;
												B = c[A >> 2] | 0;
												A = c[A + 4 >> 2] | 0;
												j = (c[b + 4088 + (p * 120 | 0) + 40 >> 2] | 0) - B | 0;
												k = (c[b + 4088 + (p * 120 | 0) + 44 >> 2] | 0) - (c[b + 4088 + (o * 120 | 0) + 44 >> 2] | 0) | 0;
												z = 0 - k | 0;
												E = Z((c[b + 4088 + (f * 120 | 0) + 40 >> 2] | 0) - B | 0, z) | 0;
												E = ((Z((c[b + 4088 + (f * 120 | 0) + 44 >> 2] | 0) - A | 0, j) | 0) + E | 0) > 0;
												k = E ? z : k;
												j = E ? 0 - j | 0 : j;
												z = E ? o : p;
												E = E ? p : o;
												c[e >> 2] = g + 1;
												p = b + 7936 + (g << 7) | 0;
												o = p;
												n = o + 128 | 0;
												do {
													c[o >> 2] = 0;
													o = o + 4 | 0
												} while ((o | 0) < (n | 0));
												c[p >> 2] = E;
												t = b + 7936 + (g << 7) + 4 | 0;
												c[t >> 2] = f;
												s = b + 7936 + (g << 7) + 8 | 0;
												c[s >> 2] = z;
												u = b + 7936 + (g << 7) + 12 | 0;
												c[u >> 2] = -1;
												F = 0;
												do {
													G = c[b + 7936 + (g << 7) + (F << 2) >> 2] | 0;
													L = 0;
													J = 0;
													I = 0;
													while (1) {
														K = Z((c[b + 4088 + (G * 120 | 0) + 8 + (I << 3) >> 2] | 0) - B | 0, k) | 0;
														K = (Z((c[b + 4088 + (G * 120 | 0) + 8 + (I << 3) + 4 >> 2] | 0) - A | 0, j) | 0) - K | 0;
														H = (I | 0) == 0 | (K | 0) < (J | 0);
														L = H ? I : L;
														I = I + 1 | 0;
														if ((I | 0) == 4)
															break;
														else
															J = H ? K : J
													}
													I = b + 4088 + (G * 120 | 0) + 8 + (((L | 0) % 4 | 0) << 3) | 0;
													K = c[I + 4 >> 2] | 0;
													J = va;
													c[J >> 2] = c[I >> 2];
													c[J + 4 >> 2] = K;
													J = b + 4088 + (G * 120 | 0) + 8 + (((1 + L | 0) % 4 | 0) << 3) | 0;
													K = c[J + 4 >> 2] | 0;
													I = T;
													c[I >> 2] = c[J >> 2];
													c[I + 4 >> 2] = K;
													I = b + 4088 + (G * 120 | 0) + 8 + (((2 + L | 0) % 4 | 0) << 3) | 0;
													K = c[I + 4 >> 2] | 0;
													J = U;
													c[J >> 2] = c[I >> 2];
													c[J + 4 >> 2] = K;
													J = b + 4088 + (G * 120 | 0) + 8 + (((3 + L | 0) % 4 | 0) << 3) | 0;
													K = c[J + 4 >> 2] | 0;
													L = V;
													c[L >> 2] = c[J >> 2];
													c[L + 4 >> 2] = K;
													L = b + 4088 + (G * 120 | 0) + 8 | 0;
													c[L >> 2] = c[va >> 2];
													c[L + 4 >> 2] = c[va + 4 >> 2];
													c[L + 8 >> 2] = c[va + 8 >> 2];
													c[L + 12 >> 2] = c[va + 12 >> 2];
													c[L + 16 >> 2] = c[va + 16 >> 2];
													c[L + 20 >> 2] = c[va + 20 >> 2];
													c[L + 24 >> 2] = c[va + 24 >> 2];
													c[L + 28 >> 2] = c[va + 28 >> 2];
													jb(b + 4088 + (G * 120 | 0) + 48 | 0, L, 7.0, 7.0);
													c[b + 4088 + (G * 120 | 0) + 112 >> 2] = g;
													F = F + 1 | 0
												} while ((F | 0) != 3);
												kb(b + 4088 + ((c[b + 7936 + (g << 7) >> 2] | 0) * 120 | 0) + 48 | 0, 6.5, .5, b + 7936 + (g << 7) + 24 | 0);
												kb(b + 4088 + ((c[b + 7936 + (g << 7) + 4 >> 2] | 0) * 120 | 0) + 48 | 0, 6.5, 6.5, b + 7936 + (g << 7) + 32 | 0);
												kb(b + 4088 + ((c[b + 7936 + (g << 7) + 8 >> 2] | 0) * 120 | 0) + 48 | 0, .5, 6.5, b + 7936 + (g << 7) + 40 | 0);
												L = b + 7936 + (g << 7) + 32 | 0;
												p = mb(b, L, b + 7936 + (g << 7) + 40 | 0) | 0;
												c[b + 7936 + (g << 7) + 48 >> 2] = p;
												L = mb(b, L, b + 7936 + (g << 7) + 24 | 0) | 0;
												c[b + 7936 + (g << 7) + 52 >> 2] = L;
												p = (L | 0) > (p | 0) ? L : p;
												if ((p | 0) >= 0 ? (ja = ((((p << 1) + -2 | 0) / 4 | 0) << 2) + 17 | 0, ka = b + 7936 + (g << 7) + 56 | 0, c[ka >> 2] = ja, la = b + 7936 + (g << 7) + 16 | 0, L = c[b + 4088 + (E * 120 | 0) + 20 >> 2] | 0, ma = (c[b + 4088 + (E * 120 | 0) + 12 >> 2] | 0) - L | 0, qa = c[b + 4088 + (E * 120 | 0) + 16 >> 2] | 0, na = qa - (c[b + 4088 + (E * 120 | 0) + 8 >> 2] | 0) | 0, sa = c[b + 4088 + (z * 120 | 0) + 36 >> 2] | 0, oa = sa - (c[b + 4088 + (z * 120 | 0) + 12 >> 2] | 0) | 0, ra = c[b + 4088 + (z * 120 | 0) + 32 >> 2] | 0, pa = ra - (c[b + 4088 + (z * 120 | 0) + 8 >> 2] | 0) | 0, qa = (Z(na, L) | 0) + (Z(ma, qa) | 0) | 0, ra = (Z(pa, sa) | 0) - (Z(ra, oa) | 0) | 0, sa = (Z(pa, ma) | 0) + (Z(oa, na) | 0) | 0, (sa | 0) != 0) : 0) {
													c[la >> 2] = ((Z(pa, qa) | 0) - (Z(ra, na) | 0) | 0) / (sa | 0) | 0;
													v = b + 7936 + (g << 7) + 20 | 0;
													c[v >> 2] = ((Z(ra, ma) | 0) + (Z(oa, qa) | 0) | 0) / (sa | 0) | 0;
													if ((ja | 0) > 21) {
														p = b + 7936 + (g << 7) | 0;
														y = c[p >> 2] | 0;
														w = c[s >> 2] | 0;
														K = la;
														L = c[K >> 2] | 0;
														K = c[K + 4 >> 2] | 0;
														x = va;
														c[x >> 2] = L;
														c[x + 4 >> 2] = K;
														y = b + 4088 + (y * 120 | 0) + 48 | 0;
														lb(y, va, Aa, Ca);
														kb(y, +h[Aa >> 3], +h[Ca >> 3] + 1.0, ua);
														w = b + 4088 + (w * 120 | 0) + 48 | 0;
														lb(w, va, Aa, Ca);
														kb(w, +h[Aa >> 3] + 1.0, +h[Ca >> 3], wa);
														w = Z(K - (c[q >> 2] | 0) | 0, (c[ua >> 2] | 0) - L | 0) | 0;
														w = (Z((c[wa >> 2] | 0) - L | 0, (c[d >> 2] | 0) - K | 0) | 0) + w | 0;
														w = (w | 0) > -1 ? w : 0 - w | 0;
														y = w * 100 | 0;
														x = (w | 0) / 2 | 0;
														w = w << 1;
														a: do
															if ((y | 0) > 1) {
																G = L;
																H = K;
																J = L;
																I = K;
																A = 0;
																z = 1;
																b: while (1) {
																	E = 784 + (A << 2) | 0;
																	B = 800 + (A << 2) | 0;
																	if ((z | 0) > 0) {
																		F = G;
																		K = 0;
																		while (1) {
																			o = fb(b, F, H) | 0;
																			if ((o | 0) > -1 ? (L = c[b + 16 + (o << 4) + 8 >> 2] | 0, !((L | 0) > (w | 0) | (L | 0) < (x | 0))) : 0)
																				break b;
																			G = (c[E >> 2] | 0) + J | 0;
																			c[va >> 2] = G;
																			L = (c[B >> 2] | 0) + I | 0;
																			c[C >> 2] = L;
																			K = K + 1 | 0;
																			if ((K | 0) >= (z | 0)) {
																				I = L;
																				J = G;
																				K = L;
																				L = G;
																				break
																			} else {
																				F = G;
																				H = L;
																				J = G;
																				I = L
																			}
																		}
																	} else {
																		K = H;
																		L = G
																	}
																	A = (A + 1 | 0) % 4 | 0;
																	z = (A & 1 ^ 1) + z | 0;
																	if ((Z(z, z) | 0) >= (y | 0)) {
																		Ea = 54;
																		break a
																	} else {
																		G = L;
																		H = K
																	}
																}
																c[u >> 2] = o
															} else
																Ea = 54;
														while (0);
														if ((Ea | 0) == 54) {
															Ea = 0;
															o = c[u >> 2] | 0
														}
														if ((o | 0) > -1) {
															K = b + 16 + (o << 4) | 0;
															I = K;
															L = c[I >> 2] | 0;
															I = c[I + 4 >> 2] | 0;
															J = la;
															c[J >> 2] = L;
															c[J + 4 >> 2] = I;
															J = ya;
															c[J >> 2] = j;
															c[J + 4 >> 2] = k;
															c[O >> 2] = la;
															L = Z(L, k) | 0;
															c[P >> 2] = (Z(c[v >> 2] | 0, j) | 0) - L;
															L = b + 16 + (o << 4) + 4 | 0;
															hb(b, c[K >> 2] | 0, c[L >> 2] | 0, o, 1, 0, 0, 0);
															hb(b, c[K >> 2] | 0, c[L >> 2] | 0, 1, c[u >> 2] | 0, 3, ya, 0);
															o = la
														} else
															o = la
													} else {
														o = la;
														p = b + 7936 + (g << 7) | 0
													}
													K = b + 4088 + ((c[t >> 2] | 0) * 120 | 0) + 8 | 0;
													L = c[K + 4 >> 2] | 0;
													J = va;
													c[J >> 2] = c[K >> 2];
													c[J + 4 >> 2] = L;
													J = b + 4088 + ((c[s >> 2] | 0) * 120 | 0) + 8 | 0;
													L = c[J + 4 >> 2] | 0;
													K = Q;
													c[K >> 2] = c[J >> 2];
													c[K + 4 >> 2] = L;
													K = o;
													o = c[K + 4 >> 2] | 0;
													L = R;
													c[L >> 2] = c[K >> 2];
													c[L + 4 >> 2] = o;
													L = b + 4088 + ((c[p >> 2] | 0) * 120 | 0) + 8 | 0;
													p = c[L + 4 >> 2] | 0;
													o = S;
													c[o >> 2] = c[L >> 2];
													c[o + 4 >> 2] = p;
													N =  + ((c[ka >> 2] | 0) + -7 | 0);
													jb(b + 7936 + (g << 7) + 64 | 0, va, N, N);
													o = ob(b, g) | 0;
													h[ua >> 3] = +h[b + 7936 + (g << 7) + 64 >> 3] * .02;
													h[W >> 3] = +h[b + 7936 + (g << 7) + 72 >> 3] * .02;
													h[X >> 3] = +h[b + 7936 + (g << 7) + 80 >> 3] * .02;
													h[Y >> 3] = +h[b + 7936 + (g << 7) + 88 >> 3] * .02;
													h[_ >> 3] = +h[b + 7936 + (g << 7) + 96 >> 3] * .02;
													h[$ >> 3] = +h[b + 7936 + (g << 7) + 104 >> 3] * .02;
													h[aa >> 3] = +h[b + 7936 + (g << 7) + 112 >> 3] * .02;
													h[ba >> 3] = +h[b + 7936 + (g << 7) + 120 >> 3] * .02;
													p = 0;
													do {
														j = 0;
														do {
															k = j >> 1;
															n = b + 7936 + (g << 7) + 64 + (k << 3) | 0;
															m = +h[n >> 3];
															N = +h[ua + (k << 3) >> 3];
															h[n >> 3] = m + ((j & 1 | 0) == 0 ? -N : N);
															k = ob(b, g) | 0;
															if ((k | 0) > (o | 0))
																o = k;
															else
																h[n >> 3] = m;
															j = j + 1 | 0
														} while ((j | 0) != 16);
														h[ua >> 3] = +h[ua >> 3] * .5;
														h[ca >> 3] = +h[ca >> 3] * .5;
														h[da >> 3] = +h[da >> 3] * .5;
														h[ea >> 3] = +h[ea >> 3] * .5;
														h[fa >> 3] = +h[fa >> 3] * .5;
														h[ga >> 3] = +h[ga >> 3] * .5;
														h[ha >> 3] = +h[ha >> 3] * .5;
														h[ia >> 3] = +h[ia >> 3] * .5;
														p = p + 1 | 0
													} while ((p | 0) != 5);
													break
												}
												c[b + 4088 + ((c[b + 7936 + (g << 7) >> 2] | 0) * 120 | 0) + 112 >> 2] = -1;
												c[b + 4088 + ((c[b + 7936 + (g << 7) + 4 >> 2] | 0) * 120 | 0) + 112 >> 2] = -1;
												c[b + 4088 + ((c[b + 7936 + (g << 7) + 8 >> 2] | 0) * 120 | 0) + 112 >> 2] = -1;
												c[e >> 2] = (c[e >> 2] | 0) + -1
											}
										while (0);
									}
								}
							}
							f = f + 1 | 0;
							g = c[ta >> 2] | 0
						} while ((f | 0) < (g | 0));
					}
					i = Fa;
					return
				}
				function db(b, e, f) {
					b = b | 0;
					e = e | 0;
					f = f | 0;
					var g = 0,
					h = 0,
					j = 0.0,
					k = 0,
					l = 0,
					m = 0,
					n = 0,
					o = 0,
					p = 0,
					q = 0,
					r = 0,
					s = 0,
					t = 0;
					t = i;
					i = i + 16 | 0;
					s = t;
					if (((e | 0) >= 0 ? (c[b + 7928 >> 2] | 0) >= (e | 0) : 0) ? (Mb(f | 0, 0, 3956) | 0, q = b + 7936 + (e << 7) + 64 | 0, kb(q, 0.0, 0.0, f), r = b + 7936 + (e << 7) + 56 | 0, kb(q,  + (c[r >> 2] | 0), 0.0, f + 8 | 0), j =  + (c[r >> 2] | 0), kb(q, j, j, f + 16 | 0), kb(q, 0.0,  + (c[r >> 2] | 0), f + 24 | 0), g = c[r >> 2] | 0, c[f + 32 >> 2] = g, l = s + 4 | 0, m = b + 8 | 0, n = b + 4 | 0, (g | 0) > 0) : 0) {
						e = 0;
						k = 0;
						do {
							j =  + (k | 0) + .5;
							if ((g | 0) > 0) {
								h = 0;
								do {
									kb(q,  + (h | 0) + .5, j, s);
									g = c[l >> 2] | 0;
									if (((((g | 0) >= 0 ? (g | 0) < (c[m >> 2] | 0) : 0) ? (o = c[s >> 2] | 0, (o | 0) >= 0) : 0) ? (p = c[n >> 2] | 0, (o | 0) < (p | 0)) : 0) ? (g = (Z(p, g) | 0) + o | 0, (a[(c[b >> 2] | 0) + g >> 0] | 0) != 0) : 0) {
										g = (e >> 3) + (f + 36) | 0;
										a[g >> 0] = d[g >> 0] | 1 << (e & 7);
									}
									e = e + 1 | 0;
									h = h + 1 | 0;
									g = c[r >> 2] | 0
								} while ((h | 0) < (g | 0));
							}
							k = k + 1 | 0
						} while ((k | 0) < (g | 0));
					}
					i = t;
					return
				}
				function eb(b) {
					b = b | 0;
					var e = 0,
					f = 0,
					g = 0,
					h = 0,
					j = 0,
					k = 0,
					l = 0,
					m = 0,
					n = 0,
					o = 0,
					p = 0,
					q = 0,
					r = 0,
					s = 0,
					t = 0,
					u = 0;
					s = i;
					n = b + 4 | 0;
					o = (c[n >> 2] | 0) / 8 | 0;
					p = b + 8 | 0;
					q = o + -1 | 0;
					r = o * 200 | 0;
					if ((c[p >> 2] | 0) > 0) {
						e = 0;
						f = 0;
						l = c[b >> 2] | 0;
						m = 0;
						while (1) {
							h = c[n >> 2] | 0;
							k = ra() | 0;
							j = i;
							i = i + ((1 * (h << 2) | 0) + 15 & -16) | 0;
							Mb(j | 0, 0, h << 2 | 0) | 0;
							h = (m & 1 | 0) == 0;
							b = c[n >> 2] | 0;
							if ((b | 0) > 0) {
								g = 0;
								do {
									t = b + ~g | 0;
									u = h ? t : g;
									t = h ? g : t;
									f = (Z(f, q) | 0) / (o | 0) | 0;
									f = (d[l + u >> 0] | 0) + f | 0;
									e = (Z(e, q) | 0) / (o | 0) | 0;
									e = (d[l + t >> 0] | 0) + e | 0;
									u = j + (u << 2) | 0;
									c[u >> 2] = (c[u >> 2] | 0) + f;
									t = j + (t << 2) | 0;
									c[t >> 2] = (c[t >> 2] | 0) + e;
									g = g + 1 | 0
								} while ((g | 0) < (b | 0));
								g = e
							} else
								g = e;
							if ((b | 0) > 0) {
								e = 0;
								do {
									b = l + e | 0;
									a[b >> 0] = (d[b >> 0] | 0 | 0) < (((c[j + (e << 2) >> 2] | 0) * 95 | 0) / (r | 0) | 0 | 0) & 1;
									e = e + 1 | 0;
									b = c[n >> 2] | 0
								} while ((e | 0) < (b | 0));
							}
							ga(k | 0);
							m = m + 1 | 0;
							if ((m | 0) >= (c[p >> 2] | 0))
								break;
							else {
								e = g;
								l = l + b | 0
							}
						}
					}
					i = s;
					return
				}
				function fb(b, d, e) {
					b = b | 0;
					d = d | 0;
					e = e | 0;
					var f = 0,
					g = 0,
					h = 0,
					i = 0;
					if (((e | d | 0) >= 0 ? (g = c[b + 4 >> 2] | 0, (g | 0) > (d | 0)) : 0) ? (c[b + 8 >> 2] | 0) > (e | 0) : 0) {
						g = (Z(g, e) | 0) + d | 0;
						g = a[(c[b >> 2] | 0) + g >> 0] | 0;
						h = g & 255;
						if ((g & 255) <= 1)
							if (g << 24 >> 24 != 0 ? (i = b + 12 | 0, f = c[i >> 2] | 0, (f | 0) <= 253) : 0) {
								c[i >> 2] = f + 1;
								i = b + 16 + (f << 4) | 0;
								c[i >> 2] = 0;
								c[i + 4 >> 2] = 0;
								c[i + 8 >> 2] = 0;
								c[i + 12 >> 2] = 0;
								c[i >> 2] = d;
								c[b + 16 + (f << 4) + 4 >> 2] = e;
								c[b + 16 + (f << 4) + 12 >> 2] = -1;
								hb(b, d, e, h, f, 4, i, 0);
							} else
								f = -1;
						else
							f = h
					} else
						f = -1;
					return f | 0
				}
				function gb(a, b, d, e) {
					a = a | 0;
					b = b | 0;
					d = d | 0;
					e = e | 0;
					var f = 0,
					g = 0,
					h = 0,
					j = 0,
					k = 0;
					k = i;
					i = i + 16 | 0;
					j = k;
					c[j >> 2] = d;
					c[j + 4 >> 2] = e;
					f = b - (c[a + 4 >> 2] | 0) | 0;
					f = Z(f, f) | 0;
					g = a + 8 | 0;
					h = a + 24 | 0;
					d = c[j >> 2] | 0;
					e = d - (c[a >> 2] | 0) | 0;
					e = (Z(e, e) | 0) + f | 0;
					if ((e | 0) > (c[g >> 2] | 0)) {
						c[g >> 2] = e;
						e = c[h >> 2] | 0;
						c[e >> 2] = d;
						c[e + 4 >> 2] = b
					}
					e = c[j + 4 >> 2] | 0;
					d = e - (c[a >> 2] | 0) | 0;
					d = (Z(d, d) | 0) + f | 0;
					if ((d | 0) > (c[g >> 2] | 0)) {
						c[g >> 2] = d;
						a = c[h >> 2] | 0;
						c[a >> 2] = e;
						c[a + 4 >> 2] = b
					}
					i = k;
					return
				}
				function hb(b, e, f, g, h, i, j, k) {
					b = b | 0;
					e = e | 0;
					f = f | 0;
					g = g | 0;
					h = h | 0;
					i = i | 0;
					j = j | 0;
					k = k | 0;
					var l = 0,
					m = 0,
					n = 0,
					o = 0,
					p = 0,
					q = 0,
					r = 0,
					s = 0,
					t = 0,
					u = 0,
					v = 0,
					w = 0,
					x = 0,
					y = 0;
					o = c[b >> 2] | 0;
					q = b + 4 | 0;
					n = c[q >> 2] | 0;
					p = Z(n, f) | 0;
					if ((k | 0) <= 4095) {
						l = e;
						while (1) {
							if ((l | 0) <= 0)
								break;
							m = l + -1 | 0;
							if ((d[o + (m + p) >> 0] | 0 | 0) == (g | 0))
								l = m;
							else
								break
						}
						n = n + -1 | 0;
						while (1) {
							if ((e | 0) >= (n | 0)) {
								n = e;
								break
							}
							m = e + 1 | 0;
							if ((d[o + (m + p) >> 0] | 0 | 0) == (g | 0))
								e = m;
							else {
								n = e;
								break
							}
						}
						m = h & 255;
						if ((l | 0) <= (n | 0)) {
							e = l;
							while (1) {
								a[o + (e + p) >> 0] = m;
								if ((e | 0) < (n | 0))
									e = e + 1 | 0;
								else
									break
							}
						}
						if (i)
							Ha[i & 7](j, f, l, n);
						if ((f | 0) > 0 ? (r = c[b >> 2] | 0, s = f + -1 | 0, t = Z(c[q >> 2] | 0, s) | 0, u = k + 1 | 0, (l | 0) <= (n | 0)) : 0) {
							m = l;
							while (1) {
								if ((d[r + (m + t) >> 0] | 0 | 0) == (g | 0))
									hb(b, m, s, g, h, i, j, u);
								if ((m | 0) < (n | 0))
									m = m + 1 | 0;
								else
									break
							}
						}
						if (((c[b + 8 >> 2] | 0) + -1 | 0) > (f | 0) ? (v = c[b >> 2] | 0, w = f + 1 | 0, x = Z(c[q >> 2] | 0, w) | 0, y = k + 1 | 0, (l | 0) <= (n | 0)) : 0)
							while (1) {
								if ((d[v + (l + x) >> 0] | 0 | 0) == (g | 0))
									hb(b, l, w, g, h, i, j, y);
								if ((l | 0) < (n | 0))
									l = l + 1 | 0;
								else
									break
							}
					}
					return
				}
				function ib(a, b, d, e) {
					a = a | 0;
					b = b | 0;
					d = d | 0;
					e = e | 0;
					var f = 0,
					g = 0,
					h = 0,
					j = 0,
					k = 0,
					l = 0,
					m = 0,
					n = 0,
					o = 0,
					p = 0,
					q = 0,
					r = 0;
					r = i;
					i = i + 32 | 0;
					q = r + 16 | 0;
					p = r;
					c[q >> 2] = d;
					c[q + 4 >> 2] = e;
					e = a + 4 | 0;
					d = p + 4 | 0;
					h = p + 8 | 0;
					j = p + 12 | 0;
					k = a + 8 | 0;
					l = a + 24 | 0;
					n = 0;
					do {
						m = c[q + (n << 2) >> 2] | 0;
						f = c[a >> 2] | 0;
						g = Z(f, m) | 0;
						o = c[e >> 2] | 0;
						g = (Z(o, b) | 0) + g | 0;
						o = (Z(f, b) | 0) - (Z(o, m) | 0) | 0;
						c[p >> 2] = g;
						c[d >> 2] = o;
						c[h >> 2] = 0 - g;
						c[j >> 2] = 0 - o;
						o = 0;
						do {
							f = c[p + (o << 2) >> 2] | 0;
							g = k + (o << 2) | 0;
							if ((f | 0) > (c[g >> 2] | 0)) {
								c[g >> 2] = f;
								g = c[l >> 2] | 0;
								c[g + (o << 3) >> 2] = m;
								c[g + (o << 3) + 4 >> 2] = b
							}
							o = o + 1 | 0
						} while ((o | 0) != 4);
						n = n + 1 | 0
					} while ((n | 0) != 2);
					i = r;
					return
				}
				function jb(a, b, d, e) {
					a = a | 0;
					b = b | 0;
					d = +d;
					e = +e;
					var f = 0.0,
					g = 0.0,
					i = 0.0,
					j = 0.0,
					k = 0.0,
					l = 0.0,
					m = 0.0,
					n = 0.0,
					o = 0.0,
					p = 0.0,
					q = 0.0,
					r = 0.0,
					s = 0.0,
					t = 0.0,
					u = 0.0,
					v = 0.0,
					w = 0.0,
					x = 0.0;
					n =  + (c[b >> 2] | 0);
					p =  + (c[b + 4 >> 2] | 0);
					k =  + (c[b + 8 >> 2] | 0);
					g =  + (c[b + 12 >> 2] | 0);
					o =  + (c[b + 16 >> 2] | 0);
					m =  + (c[b + 20 >> 2] | 0);
					f =  + (c[b + 24 >> 2] | 0);
					j =  + (c[b + 28 >> 2] | 0);
					i = o * j;
					l = m * f;
					v = i - l;
					t = f - o;
					s = g * t;
					r = m - j;
					w = k * r;
					q = (w + (s + v)) * d;
					w = i + w;
					d = (s + (w - l)) * e;
					s = g * (o - f);
					h[a >> 3] = (p * (k * t) + (k * v + n * (s + (l - i)))) / q;
					u = g * o;
					e = k * f;
					x = o * f;
					h[a + 8 >> 3] =  - (p * (e - x) + (g * x + (n * (w - u) - m * e))) / d;
					h[a + 16 >> 3] = n;
					e = k * (j - m);
					h[a + 24 >> 3] = (n * g * r + (g * v + p * (l + (e - i)))) / q;
					v = k * m;
					h[a + 32 >> 3] = (p * (l - v + s) + (v * j + n * (g * j - m * j) - u * j)) / d;
					h[a + 40 >> 3] = p;
					h[a + 48 >> 3] = (p * t + (s + (e + n * r))) / q;
					h[a + 56 >> 3] = (p * (o - k) + (n * (g - m) + (l + (k * j - i)) - g * f)) / d;
					return
				}
				function kb(a, b, d, e) {
					a = a | 0;
					b = +b;
					d = +d;
					e = e | 0;
					var f = 0.0,
					g = 0.0;
					g = +h[a + 48 >> 3] * b + +h[a + 56 >> 3] * d + 1.0;
					f = (+h[a + 40 >> 3] + (+h[a + 24 >> 3] * b + +h[a + 32 >> 3] * d)) / g;
					c[e >> 2] = ~~+Fb((+h[a + 16 >> 3] + (+h[a >> 3] * b + +h[a + 8 >> 3] * d)) / g);
					c[e + 4 >> 2] = ~~+Fb(f);
					return
				}
				function lb(a, b, d, e) {
					a = a | 0;
					b = b | 0;
					d = d | 0;
					e = e | 0;
					var f = 0.0,
					g = 0.0,
					i = 0.0,
					j = 0.0,
					k = 0.0,
					l = 0.0,
					m = 0.0,
					n = 0,
					o = 0,
					p = 0,
					q = 0.0;
					k =  + (c[b >> 2] | 0);
					m =  + (c[b + 4 >> 2] | 0);
					j = +h[a >> 3];
					l = +h[a + 56 >> 3];
					g = +h[a + 8 >> 3];
					n = a + 48 | 0;
					i = +h[n >> 3];
					b = a + 24 | 0;
					f = +h[b >> 3];
					q = +h[a + 32 >> 3];
					f = j * q + (m * (g * i) - m * (j * l) + k * (l * f - i * q)) - g * f;
					p = a + 40 | 0;
					i = +h[p >> 3];
					o = a + 16 | 0;
					j = +h[o >> 3];
					h[d >> 3] =  - (q * j + (k * (l * i - q) + (g * (m - i) - m * (l * j)))) / f;
					j = +h[p >> 3];
					l = +h[o >> 3];
					i = +h[n >> 3];
					g = +h[b >> 3];
					h[e >> 3] = (l * g + (+h[a >> 3] * (m - j) - m * (l * i) + k * (j * i - g))) / f;
					return
				}
				function mb(b, d, e) {
					b = b | 0;
					d = d | 0;
					e = e | 0;
					var f = 0,
					g = 0,
					h = 0,
					j = 0,
					k = 0,
					l = 0,
					m = 0,
					n = 0,
					o = 0,
					p = 0,
					q = 0,
					r = 0,
					s = 0,
					t = 0,
					u = 0,
					v = 0;
					v = i;
					i = i + 16 | 0;
					t = v + 4 | 0;
					u = v;
					f = c[e >> 2] | 0;
					j = c[d >> 2] | 0;
					g = f - j | 0;
					e = c[e + 4 >> 2] | 0;
					h = c[d + 4 >> 2] | 0;
					d = e - h | 0;
					c[t >> 2] = j;
					c[u >> 2] = h;
					a: do
						if ((((j | h | 0) >= 0 ? (r = c[b + 4 >> 2] | 0, (j | 0) < (r | 0)) : 0) ? (s = c[b + 8 >> 2] | 0, !((h | 0) >= (s | 0) | (f | 0) < 0)) : 0) ? (e | 0) < (s | 0) & ((f | 0) < (r | 0) & (e | 0) > -1) : 0) {
							o = (((g | 0) > -1 ? g : 0 - g | 0) | 0) > (((d | 0) > -1 ? d : 0 - d | 0) | 0);
							m = o ? g : d;
							p = o ? t : u;
							q = o ? u : t;
							o = o ? d : g;
							l = o >> 31 | 1;
							o = (o | 0) < 0 ? 0 - o | 0 : o;
							n = (m | 0) < 0 ? 0 - m | 0 : m;
							m = m >> 31 | 1;
							c[t >> 2] = j;
							c[u >> 2] = h;
							if ((n | h | 0) < 0)
								e = 0;
							else {
								g = 0;
								e = 0;
								d = 0;
								k = 0;
								while (1) {
									f = c[t >> 2] | 0;
									if (!((f | 0) > -1 & (h | 0) < (s | 0) & (f | 0) < (r | 0)))
										break a;
									j = (Z(r, h) | 0) + f | 0;
									j = (a[(c[b >> 2] | 0) + j >> 0] | 0) == 0;
									e = e + (j ? 0 : (k | 0) > 1 & 1) | 0;
									g = g + o | 0;
									c[p >> 2] = (c[p >> 2] | 0) + m;
									if ((g | 0) >= (n | 0)) {
										c[q >> 2] = (c[q >> 2] | 0) + l;
										g = g - n | 0
									}
									h = c[u >> 2] | 0;
									if ((d | 0) >= (n | 0) | (h | 0) < 0)
										break;
									else {
										d = d + 1 | 0;
										k = j ? k + 1 | 0 : 0
									}
								}
							}
						} else
							e = -1;
					while (0);
					i = v;
					return e | 0
				}
				function nb(a, b, d, e) {
					a = a | 0;
					b = b | 0;
					d = d | 0;
					e = e | 0;
					var f = 0,
					g = 0,
					h = 0,
					j = 0,
					k = 0;
					k = i;
					i = i + 16 | 0;
					j = k;
					c[j >> 2] = d;
					c[j + 4 >> 2] = e;
					f = a + 4 | 0;
					g = a + 8 | 0;
					h = a + 24 | 0;
					e = c[j >> 2] | 0;
					d = Z(e, c[f >> 2] | 0) | 0;
					d = (Z(c[a >> 2] | 0, b) | 0) - d | 0;
					if ((d | 0) < (c[g >> 2] | 0)) {
						c[g >> 2] = d;
						d = c[h >> 2] | 0;
						c[d >> 2] = e;
						c[d + 4 >> 2] = b
					}
					e = c[j + 4 >> 2] | 0;
					d = Z(e, c[f >> 2] | 0) | 0;
					d = (Z(c[a >> 2] | 0, b) | 0) - d | 0;
					if ((d | 0) < (c[g >> 2] | 0)) {
						c[g >> 2] = d;
						a = c[h >> 2] | 0;
						c[a >> 2] = e;
						c[a + 4 >> 2] = b
					}
					i = k;
					return
				}
				function ob(a, b) {
					a = a | 0;
					b = b | 0;
					var d = 0,
					e = 0,
					f = 0,
					g = 0,
					h = 0,
					i = 0,
					j = 0;
					g = a + 7936 + (b << 7) + 56 | 0;
					h = c[g >> 2] | 0;
					d = h + -17 | 0;
					if ((h | 0) > 14) {
						f = 0;
						e = 0;
						do {
							i = f + 7 | 0;
							j = pb(a, b, i, 6) | 0;
							e = (Z((pb(a, b, 6, i) | 0) + j | 0, (f << 1 & 2) + -1 | 0) | 0) + e | 0;
							f = f + 1 | 0
						} while ((f | 0) < ((c[g >> 2] | 0) + -14 | 0));
					} else
						e = 0;
					j = (d | 0) / 4 | 0;
					d = (qb(a, b, 0, 0) | 0) + e | 0;
					d = d + (qb(a, b, (c[g >> 2] | 0) + -7 | 0, 0) | 0) | 0;
					d = d + (qb(a, b, 0, (c[g >> 2] | 0) + -7 | 0) | 0) | 0;
					if ((h + -14 | 0) >>> 0 <= 166) {
						e = 0;
						while (1)
							if (!(c[1032 + (j * 80 | 0) + 4 + (e << 2) >> 2] | 0))
								break;
							else
								e = e + 1 | 0;
						if ((e | 0) > 2) {
							g = 2;
							f = 1;
							while (1) {
								f = c[1032 + (j * 80 | 0) + 4 + (f << 2) >> 2] | 0;
								d = (rb(a, b, 6, f) | 0) + d | 0;
								d = d + (rb(a, b, f, 6) | 0) | 0;
								f = g + 1 | 0;
								if ((f | 0) < (e | 0)) {
									i = g;
									g = f;
									f = i
								} else
									break
							}
						}
						if ((e | 0) > 1) {
							f = (e | 0) == 1;
							i = 1;
							do {
								if (!f) {
									h = c[1032 + (j * 80 | 0) + 4 + (i << 2) >> 2] | 0;
									g = 1;
									do {
										d = (rb(a, b, h, c[1032 + (j * 80 | 0) + 4 + (g << 2) >> 2] | 0) | 0) + d | 0;
										g = g + 1 | 0
									} while ((g | 0) != (e | 0));
								}
								i = i + 1 | 0
							} while ((i | 0) < (e | 0));
						}
					}
					return d | 0
				}
				function pb(b, d, e, f) {
					b = b | 0;
					d = d | 0;
					e = e | 0;
					f = f | 0;
					var g = 0.0,
					j = 0.0,
					k = 0,
					l = 0,
					m = 0,
					n = 0,
					o = 0.0,
					p = 0,
					q = 0,
					r = 0,
					s = 0,
					t = 0;
					t = i;
					i = i + 16 | 0;
					s = t;
					p = b + 7936 + (d << 7) + 64 | 0;
					o =  + (e | 0);
					j =  + (f | 0);
					k = s + 4 | 0;
					l = b + 8 | 0;
					m = b + 4 | 0;
					d = 0;
					n = 0;
					do {
						g = j + +h[816 + (n << 3) >> 3];
						e = 0;
						do {
							kb(p, o + +h[816 + (e << 3) >> 3], g, s);
							f = c[k >> 2] | 0;
							do
								if ((((f | 0) >= 0 ? (f | 0) < (c[l >> 2] | 0) : 0) ? (q = c[s >> 2] | 0, (q | 0) >= 0) : 0) ? (r = c[m >> 2] | 0, (q | 0) < (r | 0)) : 0) {
									f = (Z(r, f) | 0) + q | 0;
									if (!(a[(c[b >> 2] | 0) + f >> 0] | 0)) {
										d = d + -1 | 0;
										break
									} else {
										d = d + 1 | 0;
										break
									}
								}
							while (0);
							e = e + 1 | 0
						} while ((e | 0) != 3);
						n = n + 1 | 0
					} while ((n | 0) != 3);
					i = t;
					return d | 0
				}
				function qb(a, b, c, d) {
					a = a | 0;
					b = b | 0;
					c = c | 0;
					d = d | 0;
					var e = 0;
					c = c + 3 | 0;
					d = d + 3 | 0;
					e = pb(a, b, c, d) | 0;
					e = (sb(a, b, c, d, 1) | 0) + e | 0;
					e = e - (sb(a, b, c, d, 2) | 0) | 0;
					return e + (sb(a, b, c, d, 3) | 0) | 0
				}
				function rb(a, b, c, d) {
					a = a | 0;
					b = b | 0;
					c = c | 0;
					d = d | 0;
					var e = 0;
					e = pb(a, b, c, d) | 0;
					e = e - (sb(a, b, c, d, 1) | 0) | 0;
					return e + (sb(a, b, c, d, 2) | 0) | 0
				}
				function sb(a, b, c, d, e) {
					a = a | 0;
					b = b | 0;
					c = c | 0;
					d = d | 0;
					e = e | 0;
					var f = 0,
					g = 0,
					h = 0,
					i = 0,
					j = 0;
					h = e << 1;
					i = c - e | 0;
					j = d - e | 0;
					g = e + d | 0;
					f = e + c | 0;
					if ((e | 0) > 0) {
						c = 0;
						d = 0;
						do {
							d = (pb(a, b, c + i | 0, j) | 0) + d | 0;
							d = d + (pb(a, b, i, g - c | 0) | 0) | 0;
							d = d + (pb(a, b, f, c + j | 0) | 0) | 0;
							d = d + (pb(a, b, f - c | 0, g) | 0) | 0;
							c = c + 1 | 0
						} while ((c | 0) < (h | 0));
					} else
						d = 0;
					return d | 0
				}
				function tb(a, b, d, e) {
					a = a | 0;
					b = b | 0;
					d = d | 0;
					e = e | 0;
					b = a + 8 | 0;
					c[b >> 2] = 1 - d + e + (c[b >> 2] | 0);
					return
				}
				function ub() {
					var a = 0;
					a = Gb(8960) | 0;
					if (!a)
						a = 0;
					else
						Mb(a | 0, 0, 8960) | 0;
					return a | 0
				}
				function vb(a, b, d) {
					a = a | 0;
					b = b | 0;
					d = d | 0;
					var e = 0;
					e = Ib(c[a >> 2] | 0, Z(d, b) | 0) | 0;
					if (!e)
						e = -1;
					else {
						c[a >> 2] = e;
						c[a + 4 >> 2] = b;
						c[a + 8 >> 2] = d;
						e = 0
					}
					return e | 0
				}
				function wb(a) {
					a = a | 0;
					return c[a + 7928 >> 2] | 0
				}
				function xb(a) {
					a = a | 0;
					if (a >>> 0 < 8)
						a = c[840 + (a << 2) >> 2] | 0;
					else
						a = 872;
					return a | 0
				}
				function yb() {
					var a = 0;
					a = ub() | 0;
					c[1078] = a;
					if (!a)
						pa(4328);
					return
				}
				function zb(a, b) {
					a = a | 0;
					b = b | 0;
					if ((vb(c[1078] | 0, a, b) | 0) < 0)
						pa(4360);
					return
				}
				function Ab() {
					c[1080] = bb(c[1078] | 0, 0, 0) | 0;
					return
				}
				function Bb() {
					cb(c[1078] | 0);
					return
				}
				function Cb() {
					var a = 0,
					b = 0,
					d = 0,
					e = 0,
					f = 0,
					g = 0,
					h = 0,
					j = 0,
					k = 0,
					l = 0,
					m = 0,
					n = 0,
					o = 0,
					p = 0,
					q = 0,
					r = 0,
					s = 0,
					t = 0,
					u = 0;
					u = i;
					i = i + 12880 | 0;
					t = u;
					q = u + 8920 | 0;
					r = u + 4 | 0;
					a = wb(c[1078] | 0) | 0;
					Fa(0, a | 0) | 0;
					j = r + 4 | 0;
					k = r + 8 | 0;
					l = r + 12 | 0;
					m = r + 16 | 0;
					n = r + 8912 | 0;
					o = q + 4 | 0;
					p = q + 8 | 0;
					b = q + 12 | 0;
					d = q + 16 | 0;
					e = q + 20 | 0;
					f = q + 24 | 0;
					g = q + 28 | 0;
					if ((a | 0) > 0) {
						s = 0;
						do {
							db(c[1078] | 0, s, q);
							h = Ra(q, r) | 0;
							if (!h)
								ua(1, s | 0, c[r >> 2] | 0, c[j >> 2] | 0, c[k >> 2] | 0, c[l >> 2] | 0, m | 0, c[n >> 2] | 0, c[q >> 2] | 0, c[o >> 2] | 0, c[p >> 2] | 0, c[b >> 2] | 0, c[d >> 2] | 0, c[e >> 2] | 0, c[f >> 2] | 0, c[g >> 2] | 0) | 0;
							else {
								c[t >> 2] = xb(h) | 0;
								ta(4432, t | 0) | 0
							}
							s = s + 1 | 0
						} while ((s | 0) < (a | 0));
					}
					i = u;
					return
				}
				function Db(a, b) {
					a = a | 0;
					b = b | 0;
					yb();
					zb(a, b);
					Ab();
					return c[1080] | 0
				}
				function Eb() {
					Bb();
					Cb();
					Ab();
					return c[1080] | 0
				}
				function Fb(a) {
					a = +a;
					var b = 0,
					d = 0;
					h[k >> 3] = a;
					b = c[k + 4 >> 2] | 0;
					d = b & 2146435072;
					if (d >>> 0 > 1126170624 | (d | 0) == 1126170624 & 0 > 0)
						return +a;
					b = (b | 0) < 0;
					a = b ? a + -4503599627370496.0 + 4503599627370496.0 : a + 4503599627370496.0 + -4503599627370496.0;
					if (!(a == 0.0))
						return +a;
					a = b ? -0.0 : 0.0;
					return +a
				}
				function Gb(a) {
					a = a | 0;
					var b = 0,
					d = 0,
					e = 0,
					f = 0,
					g = 0,
					h = 0,
					i = 0,
					j = 0,
					k = 0,
					l = 0,
					m = 0,
					n = 0,
					o = 0,
					p = 0,
					q = 0,
					r = 0,
					s = 0,
					t = 0,
					u = 0,
					v = 0,
					w = 0,
					x = 0,
					y = 0,
					z = 0,
					A = 0,
					B = 0,
					C = 0,
					D = 0,
					E = 0,
					F = 0,
					G = 0,
					H = 0,
					I = 0,
					J = 0,
					K = 0,
					L = 0,
					M = 0,
					N = 0;
					do
						if (a >>> 0 < 245) {
							q = a >>> 0 < 11 ? 16 : a + 11 & -8;
							a = q >>> 3;
							l = c[1166] | 0;
							j = l >>> a;
							if (j & 3) {
								e = (j & 1 ^ 1) + a | 0;
								f = e << 1;
								b = 4704 + (f << 2) | 0;
								f = 4704 + (f + 2 << 2) | 0;
								g = c[f >> 2] | 0;
								h = g + 8 | 0;
								i = c[h >> 2] | 0;
								do
									if ((b | 0) != (i | 0)) {
										if (i >>> 0 < (c[1170] | 0) >>> 0)
											ya();
										d = i + 12 | 0;
										if ((c[d >> 2] | 0) == (g | 0)) {
											c[d >> 2] = b;
											c[f >> 2] = i;
											break
										} else
											ya();
									} else
										c[1166] = l & ~(1 << e);
								while (0);
								N = e << 3;
								c[g + 4 >> 2] = N | 3;
								N = g + (N | 4) | 0;
								c[N >> 2] = c[N >> 2] | 1;
								N = h;
								return N | 0
							}
							b = c[1168] | 0;
							if (q >>> 0 > b >>> 0) {
								if (j) {
									f = 2 << a;
									f = j << a & (f | 0 - f);
									f = (f & 0 - f) + -1 | 0;
									a = f >>> 12 & 16;
									f = f >>> a;
									e = f >>> 5 & 8;
									f = f >>> e;
									d = f >>> 2 & 4;
									f = f >>> d;
									g = f >>> 1 & 2;
									f = f >>> g;
									h = f >>> 1 & 1;
									h = (e | a | d | g | h) + (f >>> h) | 0;
									f = h << 1;
									g = 4704 + (f << 2) | 0;
									f = 4704 + (f + 2 << 2) | 0;
									d = c[f >> 2] | 0;
									a = d + 8 | 0;
									e = c[a >> 2] | 0;
									do
										if ((g | 0) != (e | 0)) {
											if (e >>> 0 < (c[1170] | 0) >>> 0)
												ya();
											i = e + 12 | 0;
											if ((c[i >> 2] | 0) == (d | 0)) {
												c[i >> 2] = g;
												c[f >> 2] = e;
												k = c[1168] | 0;
												break
											} else
												ya();
										} else {
											c[1166] = l & ~(1 << h);
											k = b
										}
									while (0);
									N = h << 3;
									b = N - q | 0;
									c[d + 4 >> 2] = q | 3;
									j = d + q | 0;
									c[d + (q | 4) >> 2] = b | 1;
									c[d + N >> 2] = b;
									if (k) {
										e = c[1171] | 0;
										g = k >>> 3;
										i = g << 1;
										f = 4704 + (i << 2) | 0;
										h = c[1166] | 0;
										g = 1 << g;
										if (h & g) {
											h = 4704 + (i + 2 << 2) | 0;
											i = c[h >> 2] | 0;
											if (i >>> 0 < (c[1170] | 0) >>> 0)
												ya();
											else {
												m = h;
												n = i
											}
										} else {
											c[1166] = h | g;
											m = 4704 + (i + 2 << 2) | 0;
											n = f
										}
										c[m >> 2] = e;
										c[n + 12 >> 2] = e;
										c[e + 8 >> 2] = n;
										c[e + 12 >> 2] = f
									}
									c[1168] = b;
									c[1171] = j;
									N = a;
									return N | 0
								}
								a = c[1167] | 0;
								if (a) {
									h = (a & 0 - a) + -1 | 0;
									M = h >>> 12 & 16;
									h = h >>> M;
									L = h >>> 5 & 8;
									h = h >>> L;
									N = h >>> 2 & 4;
									h = h >>> N;
									i = h >>> 1 & 2;
									h = h >>> i;
									g = h >>> 1 & 1;
									g = c[4968 + ((L | M | N | i | g) + (h >>> g) << 2) >> 2] | 0;
									h = (c[g + 4 >> 2] & -8) - q | 0;
									i = g;
									while (1) {
										d = c[i + 16 >> 2] | 0;
										if (!d) {
											d = c[i + 20 >> 2] | 0;
											if (!d) {
												l = h;
												k = g;
												break
											}
										}
										i = (c[d + 4 >> 2] & -8) - q | 0;
										N = i >>> 0 < h >>> 0;
										h = N ? i : h;
										i = d;
										g = N ? d : g
									}
									a = c[1170] | 0;
									if (k >>> 0 < a >>> 0)
										ya();
									b = k + q | 0;
									if (k >>> 0 >= b >>> 0)
										ya();
									j = c[k + 24 >> 2] | 0;
									g = c[k + 12 >> 2] | 0;
									do
										if ((g | 0) == (k | 0)) {
											h = k + 20 | 0;
											i = c[h >> 2] | 0;
											if (!i) {
												h = k + 16 | 0;
												i = c[h >> 2] | 0;
												if (!i) {
													e = 0;
													break
												}
											}
											while (1) {
												g = i + 20 | 0;
												f = c[g >> 2] | 0;
												if (f) {
													i = f;
													h = g;
													continue
												}
												g = i + 16 | 0;
												f = c[g >> 2] | 0;
												if (!f)
													break;
												else {
													i = f;
													h = g
												}
											}
											if (h >>> 0 < a >>> 0)
												ya();
											else {
												c[h >> 2] = 0;
												e = i;
												break
											}
										} else {
											f = c[k + 8 >> 2] | 0;
											if (f >>> 0 < a >>> 0)
												ya();
											i = f + 12 | 0;
											if ((c[i >> 2] | 0) != (k | 0))
												ya();
											h = g + 8 | 0;
											if ((c[h >> 2] | 0) == (k | 0)) {
												c[i >> 2] = g;
												c[h >> 2] = f;
												e = g;
												break
											} else
												ya();
										}
									while (0);
									do
										if (j) {
											i = c[k + 28 >> 2] | 0;
											h = 4968 + (i << 2) | 0;
											if ((k | 0) == (c[h >> 2] | 0)) {
												c[h >> 2] = e;
												if (!e) {
													c[1167] = c[1167] & ~(1 << i);
													break
												}
											} else {
												if (j >>> 0 < (c[1170] | 0) >>> 0)
													ya();
												i = j + 16 | 0;
												if ((c[i >> 2] | 0) == (k | 0))
													c[i >> 2] = e;
												else
													c[j + 20 >> 2] = e;
												if (!e)
													break
											}
											h = c[1170] | 0;
											if (e >>> 0 < h >>> 0)
												ya();
											c[e + 24 >> 2] = j;
											i = c[k + 16 >> 2] | 0;
											do
												if (i)
													if (i >>> 0 < h >>> 0)
														ya();
													else {
														c[e + 16 >> 2] = i;
														c[i + 24 >> 2] = e;
														break
													}
											while (0);
											i = c[k + 20 >> 2] | 0;
											if (i)
												if (i >>> 0 < (c[1170] | 0) >>> 0)
													ya();
												else {
													c[e + 20 >> 2] = i;
													c[i + 24 >> 2] = e;
													break
												}
										}
									while (0);
									if (l >>> 0 < 16) {
										N = l + q | 0;
										c[k + 4 >> 2] = N | 3;
										N = k + (N + 4) | 0;
										c[N >> 2] = c[N >> 2] | 1
									} else {
										c[k + 4 >> 2] = q | 3;
										c[k + (q | 4) >> 2] = l | 1;
										c[k + (l + q) >> 2] = l;
										d = c[1168] | 0;
										if (d) {
											e = c[1171] | 0;
											g = d >>> 3;
											i = g << 1;
											f = 4704 + (i << 2) | 0;
											h = c[1166] | 0;
											g = 1 << g;
											if (h & g) {
												i = 4704 + (i + 2 << 2) | 0;
												h = c[i >> 2] | 0;
												if (h >>> 0 < (c[1170] | 0) >>> 0)
													ya();
												else {
													p = i;
													o = h
												}
											} else {
												c[1166] = h | g;
												p = 4704 + (i + 2 << 2) | 0;
												o = f
											}
											c[p >> 2] = e;
											c[o + 12 >> 2] = e;
											c[e + 8 >> 2] = o;
											c[e + 12 >> 2] = f
										}
										c[1168] = l;
										c[1171] = b
									}
									N = k + 8 | 0;
									return N | 0
								} else
									z = q
							} else
								z = q
						} else if (a >>> 0 <= 4294967231) {
							a = a + 11 | 0;
							p = a & -8;
							k = c[1167] | 0;
							if (k) {
								j = 0 - p | 0;
								a = a >>> 8;
								if (a)
									if (p >>> 0 > 16777215)
										l = 31;
									else {
										q = (a + 1048320 | 0) >>> 16 & 8;
										w = a << q;
										o = (w + 520192 | 0) >>> 16 & 4;
										w = w << o;
										l = (w + 245760 | 0) >>> 16 & 2;
										l = 14 - (o | q | l) + (w << l >>> 15) | 0;
										l = p >>> (l + 7 | 0) & 1 | l << 1
									}
								else
									l = 0;
								a = c[4968 + (l << 2) >> 2] | 0;
								a: do
									if (!a) {
										h = 0;
										a = 0;
										w = 86
									} else {
										e = j;
										h = 0;
										d = p << ((l | 0) == 31 ? 0 : 25 - (l >>> 1) | 0);
										b = a;
										a = 0;
										while (1) {
											g = c[b + 4 >> 2] & -8;
											j = g - p | 0;
											if (j >>> 0 < e >>> 0)
												if ((g | 0) == (p | 0)) {
													g = b;
													a = b;
													w = 90;
													break a
												} else
													a = b;
											else
												j = e;
											w = c[b + 20 >> 2] | 0;
											b = c[b + 16 + (d >>> 31 << 2) >> 2] | 0;
											h = (w | 0) == 0 | (w | 0) == (b | 0) ? h : w;
											if (!b) {
												w = 86;
												break
											} else {
												e = j;
												d = d << 1
											}
										}
									}
								while (0);
								if ((w | 0) == 86) {
									if ((h | 0) == 0 & (a | 0) == 0) {
										a = 2 << l;
										a = k & (a | 0 - a);
										if (!a) {
											z = p;
											break
										}
										a = (a & 0 - a) + -1 | 0;
										n = a >>> 12 & 16;
										a = a >>> n;
										m = a >>> 5 & 8;
										a = a >>> m;
										o = a >>> 2 & 4;
										a = a >>> o;
										q = a >>> 1 & 2;
										a = a >>> q;
										h = a >>> 1 & 1;
										h = c[4968 + ((m | n | o | q | h) + (a >>> h) << 2) >> 2] | 0;
										a = 0
									}
									if (!h) {
										n = j;
										q = a
									} else {
										g = h;
										w = 90
									}
								}
								if ((w | 0) == 90)
									while (1) {
										w = 0;
										q = (c[g + 4 >> 2] & -8) - p | 0;
										h = q >>> 0 < j >>> 0;
										j = h ? q : j;
										a = h ? g : a;
										h = c[g + 16 >> 2] | 0;
										if (h) {
											g = h;
											w = 90;
											continue
										}
										g = c[g + 20 >> 2] | 0;
										if (!g) {
											n = j;
											q = a;
											break
										} else
											w = 90
									}
								if ((q | 0) != 0 ? n >>> 0 < ((c[1168] | 0) - p | 0) >>> 0 : 0) {
									a = c[1170] | 0;
									if (q >>> 0 < a >>> 0)
										ya();
									m = q + p | 0;
									if (q >>> 0 >= m >>> 0)
										ya();
									j = c[q + 24 >> 2] | 0;
									g = c[q + 12 >> 2] | 0;
									do
										if ((g | 0) == (q | 0)) {
											h = q + 20 | 0;
											i = c[h >> 2] | 0;
											if (!i) {
												h = q + 16 | 0;
												i = c[h >> 2] | 0;
												if (!i) {
													s = 0;
													break
												}
											}
											while (1) {
												g = i + 20 | 0;
												f = c[g >> 2] | 0;
												if (f) {
													i = f;
													h = g;
													continue
												}
												g = i + 16 | 0;
												f = c[g >> 2] | 0;
												if (!f)
													break;
												else {
													i = f;
													h = g
												}
											}
											if (h >>> 0 < a >>> 0)
												ya();
											else {
												c[h >> 2] = 0;
												s = i;
												break
											}
										} else {
											f = c[q + 8 >> 2] | 0;
											if (f >>> 0 < a >>> 0)
												ya();
											i = f + 12 | 0;
											if ((c[i >> 2] | 0) != (q | 0))
												ya();
											h = g + 8 | 0;
											if ((c[h >> 2] | 0) == (q | 0)) {
												c[i >> 2] = g;
												c[h >> 2] = f;
												s = g;
												break
											} else
												ya();
										}
									while (0);
									do
										if (j) {
											i = c[q + 28 >> 2] | 0;
											h = 4968 + (i << 2) | 0;
											if ((q | 0) == (c[h >> 2] | 0)) {
												c[h >> 2] = s;
												if (!s) {
													c[1167] = c[1167] & ~(1 << i);
													break
												}
											} else {
												if (j >>> 0 < (c[1170] | 0) >>> 0)
													ya();
												i = j + 16 | 0;
												if ((c[i >> 2] | 0) == (q | 0))
													c[i >> 2] = s;
												else
													c[j + 20 >> 2] = s;
												if (!s)
													break
											}
											h = c[1170] | 0;
											if (s >>> 0 < h >>> 0)
												ya();
											c[s + 24 >> 2] = j;
											i = c[q + 16 >> 2] | 0;
											do
												if (i)
													if (i >>> 0 < h >>> 0)
														ya();
													else {
														c[s + 16 >> 2] = i;
														c[i + 24 >> 2] = s;
														break
													}
											while (0);
											i = c[q + 20 >> 2] | 0;
											if (i)
												if (i >>> 0 < (c[1170] | 0) >>> 0)
													ya();
												else {
													c[s + 20 >> 2] = i;
													c[i + 24 >> 2] = s;
													break
												}
										}
									while (0);
									b: do
										if (n >>> 0 >= 16) {
											c[q + 4 >> 2] = p | 3;
											c[q + (p | 4) >> 2] = n | 1;
											c[q + (n + p) >> 2] = n;
											i = n >>> 3;
											if (n >>> 0 < 256) {
												h = i << 1;
												f = 4704 + (h << 2) | 0;
												g = c[1166] | 0;
												i = 1 << i;
												if (g & i) {
													i = 4704 + (h + 2 << 2) | 0;
													h = c[i >> 2] | 0;
													if (h >>> 0 < (c[1170] | 0) >>> 0)
														ya();
													else {
														t = i;
														u = h
													}
												} else {
													c[1166] = g | i;
													t = 4704 + (h + 2 << 2) | 0;
													u = f
												}
												c[t >> 2] = m;
												c[u + 12 >> 2] = m;
												c[q + (p + 8) >> 2] = u;
												c[q + (p + 12) >> 2] = f;
												break
											}
											d = n >>> 8;
											if (d)
												if (n >>> 0 > 16777215)
													f = 31;
												else {
													M = (d + 1048320 | 0) >>> 16 & 8;
													N = d << M;
													L = (N + 520192 | 0) >>> 16 & 4;
													N = N << L;
													f = (N + 245760 | 0) >>> 16 & 2;
													f = 14 - (L | M | f) + (N << f >>> 15) | 0;
													f = n >>> (f + 7 | 0) & 1 | f << 1
												}
											else
												f = 0;
											i = 4968 + (f << 2) | 0;
											c[q + (p + 28) >> 2] = f;
											c[q + (p + 20) >> 2] = 0;
											c[q + (p + 16) >> 2] = 0;
											h = c[1167] | 0;
											g = 1 << f;
											if (!(h & g)) {
												c[1167] = h | g;
												c[i >> 2] = m;
												c[q + (p + 24) >> 2] = i;
												c[q + (p + 12) >> 2] = m;
												c[q + (p + 8) >> 2] = m;
												break
											}
											d = c[i >> 2] | 0;
											c: do
												if ((c[d + 4 >> 2] & -8 | 0) != (n | 0)) {
													h = n << ((f | 0) == 31 ? 0 : 25 - (f >>> 1) | 0);
													while (1) {
														b = d + 16 + (h >>> 31 << 2) | 0;
														i = c[b >> 2] | 0;
														if (!i)
															break;
														if ((c[i + 4 >> 2] & -8 | 0) == (n | 0)) {
															z = i;
															break c
														} else {
															h = h << 1;
															d = i
														}
													}
													if (b >>> 0 < (c[1170] | 0) >>> 0)
														ya();
													else {
														c[b >> 2] = m;
														c[q + (p + 24) >> 2] = d;
														c[q + (p + 12) >> 2] = m;
														c[q + (p + 8) >> 2] = m;
														break b
													}
												} else
													z = d;
											while (0);
											d = z + 8 | 0;
											b = c[d >> 2] | 0;
											N = c[1170] | 0;
											if (b >>> 0 >= N >>> 0 & z >>> 0 >= N >>> 0) {
												c[b + 12 >> 2] = m;
												c[d >> 2] = m;
												c[q + (p + 8) >> 2] = b;
												c[q + (p + 12) >> 2] = z;
												c[q + (p + 24) >> 2] = 0;
												break
											} else
												ya();
										} else {
											N = n + p | 0;
											c[q + 4 >> 2] = N | 3;
											N = q + (N + 4) | 0;
											c[N >> 2] = c[N >> 2] | 1
										}
									while (0);
									N = q + 8 | 0;
									return N | 0
								} else
									z = p
							} else
								z = p
						} else
							z = -1;
					while (0);
					a = c[1168] | 0;
					if (a >>> 0 >= z >>> 0) {
						b = a - z | 0;
						d = c[1171] | 0;
						if (b >>> 0 > 15) {
							c[1171] = d + z;
							c[1168] = b;
							c[d + (z + 4) >> 2] = b | 1;
							c[d + a >> 2] = b;
							c[d + 4 >> 2] = z | 3
						} else {
							c[1168] = 0;
							c[1171] = 0;
							c[d + 4 >> 2] = a | 3;
							N = d + (a + 4) | 0;
							c[N >> 2] = c[N >> 2] | 1
						}
						N = d + 8 | 0;
						return N | 0
					}
					a = c[1169] | 0;
					if (a >>> 0 > z >>> 0) {
						M = a - z | 0;
						c[1169] = M;
						N = c[1172] | 0;
						c[1172] = N + z;
						c[N + (z + 4) >> 2] = M | 1;
						c[N + 4 >> 2] = z | 3;
						N = N + 8 | 0;
						return N | 0
					}
					do
						if (!(c[1284] | 0)) {
							a = qa(30) | 0;
							if (!(a + -1 & a)) {
								c[1286] = a;
								c[1285] = a;
								c[1287] = -1;
								c[1288] = -1;
								c[1289] = 0;
								c[1277] = 0;
								c[1284] = (Aa(0) | 0) & -16 ^ 1431655768;
								break
							} else
								ya();
						}
					while (0);
					l = z + 48 | 0;
					d = c[1286] | 0;
					k = z + 47 | 0;
					e = d + k | 0;
					d = 0 - d | 0;
					m = e & d;
					if (m >>> 0 <= z >>> 0) {
						N = 0;
						return N | 0
					}
					a = c[1276] | 0;
					if ((a | 0) != 0 ? (t = c[1274] | 0, u = t + m | 0, u >>> 0 <= t >>> 0 | u >>> 0 > a >>> 0) : 0) {
						N = 0;
						return N | 0
					}
					d: do
						if (!(c[1277] & 4)) {
							a = c[1172] | 0;
							e: do
								if (a) {
									h = 5112;
									while (1) {
										j = c[h >> 2] | 0;
										if (j >>> 0 <= a >>> 0 ? (r = h + 4 | 0, (j + (c[r >> 2] | 0) | 0) >>> 0 > a >>> 0) : 0) {
											g = h;
											a = r;
											break
										}
										h = c[h + 8 >> 2] | 0;
										if (!h) {
											w = 174;
											break e
										}
									}
									j = e - (c[1169] | 0) & d;
									if (j >>> 0 < 2147483647) {
										h = ma(j | 0) | 0;
										u = (h | 0) == ((c[g >> 2] | 0) + (c[a >> 2] | 0) | 0);
										a = u ? j : 0;
										if (u) {
											if ((h | 0) != (-1 | 0)) {
												x = h;
												w = 194;
												break d
											}
										} else
											w = 184
									} else
										a = 0
								} else
									w = 174;
							while (0);
							do
								if ((w | 0) == 174) {
									g = ma(0) | 0;
									if ((g | 0) != (-1 | 0)) {
										a = g;
										j = c[1285] | 0;
										h = j + -1 | 0;
										if (!(h & a))
											j = m;
										else
											j = m - a + (h + a & 0 - j) | 0;
										a = c[1274] | 0;
										h = a + j | 0;
										if (j >>> 0 > z >>> 0 & j >>> 0 < 2147483647) {
											u = c[1276] | 0;
											if ((u | 0) != 0 ? h >>> 0 <= a >>> 0 | h >>> 0 > u >>> 0 : 0) {
												a = 0;
												break
											}
											h = ma(j | 0) | 0;
											w = (h | 0) == (g | 0);
											a = w ? j : 0;
											if (w) {
												x = g;
												w = 194;
												break d
											} else
												w = 184
										} else
											a = 0
									} else
										a = 0
								}
							while (0);
							f: do
								if ((w | 0) == 184) {
									g = 0 - j | 0;
									do
										if (l >>> 0 > j >>> 0 & (j >>> 0 < 2147483647 & (h | 0) != (-1 | 0)) ? (v = c[1286] | 0, v = k - j + v & 0 - v, v >>> 0 < 2147483647) : 0)
											if ((ma(v | 0) | 0) == (-1 | 0)) {
												ma(g | 0) | 0;
												break f
											} else {
												j = v + j | 0;
												break
											}
									while (0);
									if ((h | 0) != (-1 | 0)) {
										x = h;
										a = j;
										w = 194;
										break d
									}
								}
							while (0);
							c[1277] = c[1277] | 4;
							w = 191
						} else {
							a = 0;
							w = 191
						}
					while (0);
					if ((((w | 0) == 191 ? m >>> 0 < 2147483647 : 0) ? (x = ma(m | 0) | 0, y = ma(0) | 0, x >>> 0 < y >>> 0 & ((x | 0) != (-1 | 0) & (y | 0) != (-1 | 0))) : 0) ? (A = y - x | 0, B = A >>> 0 > (z + 40 | 0) >>> 0, B) : 0) {
						a = B ? A : a;
						w = 194
					}
					if ((w | 0) == 194) {
						j = (c[1274] | 0) + a | 0;
						c[1274] = j;
						if (j >>> 0 > (c[1275] | 0) >>> 0)
							c[1275] = j;
						n = c[1172] | 0;
						g: do
							if (n) {
								e = 5112;
								do {
									j = c[e >> 2] | 0;
									h = e + 4 | 0;
									g = c[h >> 2] | 0;
									if ((x | 0) == (j + g | 0)) {
										C = j;
										D = h;
										E = g;
										F = e;
										w = 204;
										break
									}
									e = c[e + 8 >> 2] | 0
								} while ((e | 0) != 0);
								if (((w | 0) == 204 ? (c[F + 12 >> 2] & 8 | 0) == 0 : 0) ? n >>> 0 < x >>> 0 & n >>> 0 >= C >>> 0 : 0) {
									c[D >> 2] = E + a;
									N = (c[1169] | 0) + a | 0;
									M = n + 8 | 0;
									M = (M & 7 | 0) == 0 ? 0 : 0 - M & 7;
									L = N - M | 0;
									c[1172] = n + M;
									c[1169] = L;
									c[n + (M + 4) >> 2] = L | 1;
									c[n + (N + 4) >> 2] = 40;
									c[1173] = c[1288];
									break
								}
								j = c[1170] | 0;
								if (x >>> 0 < j >>> 0) {
									c[1170] = x;
									j = x
								}
								h = x + a | 0;
								e = 5112;
								while (1) {
									if ((c[e >> 2] | 0) == (h | 0)) {
										g = e;
										h = e;
										w = 212;
										break
									}
									e = c[e + 8 >> 2] | 0;
									if (!e) {
										g = 5112;
										break
									}
								}
								if ((w | 0) == 212)
									if (!(c[h + 12 >> 2] & 8)) {
										c[g >> 2] = x;
										p = h + 4 | 0;
										c[p >> 2] = (c[p >> 2] | 0) + a;
										p = x + 8 | 0;
										p = (p & 7 | 0) == 0 ? 0 : 0 - p & 7;
										b = x + (a + 8) | 0;
										b = (b & 7 | 0) == 0 ? 0 : 0 - b & 7;
										i = x + (b + a) | 0;
										o = p + z | 0;
										q = x + o | 0;
										m = i - (x + p) - z | 0;
										c[x + (p + 4) >> 2] = z | 3;
										h: do
											if ((i | 0) != (n | 0)) {
												if ((i | 0) == (c[1171] | 0)) {
													N = (c[1168] | 0) + m | 0;
													c[1168] = N;
													c[1171] = q;
													c[x + (o + 4) >> 2] = N | 1;
													c[x + (N + o) >> 2] = N;
													break
												}
												l = a + 4 | 0;
												h = c[x + (l + b) >> 2] | 0;
												if ((h & 3 | 0) == 1) {
													k = h & -8;
													e = h >>> 3;
													i: do
														if (h >>> 0 >= 256) {
															d = c[x + ((b | 24) + a) >> 2] | 0;
															g = c[x + (a + 12 + b) >> 2] | 0;
															do
																if ((g | 0) == (i | 0)) {
																	f = b | 16;
																	g = x + (l + f) | 0;
																	h = c[g >> 2] | 0;
																	if (!h) {
																		g = x + (f + a) | 0;
																		h = c[g >> 2] | 0;
																		if (!h) {
																			K = 0;
																			break
																		}
																	}
																	while (1) {
																		f = h + 20 | 0;
																		e = c[f >> 2] | 0;
																		if (e) {
																			h = e;
																			g = f;
																			continue
																		}
																		f = h + 16 | 0;
																		e = c[f >> 2] | 0;
																		if (!e)
																			break;
																		else {
																			h = e;
																			g = f
																		}
																	}
																	if (g >>> 0 < j >>> 0)
																		ya();
																	else {
																		c[g >> 2] = 0;
																		K = h;
																		break
																	}
																} else {
																	f = c[x + ((b | 8) + a) >> 2] | 0;
																	if (f >>> 0 < j >>> 0)
																		ya();
																	j = f + 12 | 0;
																	if ((c[j >> 2] | 0) != (i | 0))
																		ya();
																	h = g + 8 | 0;
																	if ((c[h >> 2] | 0) == (i | 0)) {
																		c[j >> 2] = g;
																		c[h >> 2] = f;
																		K = g;
																		break
																	} else
																		ya();
																}
															while (0);
															if (!d)
																break;
															j = c[x + (a + 28 + b) >> 2] | 0;
															h = 4968 + (j << 2) | 0;
															do
																if ((i | 0) != (c[h >> 2] | 0)) {
																	if (d >>> 0 < (c[1170] | 0) >>> 0)
																		ya();
																	j = d + 16 | 0;
																	if ((c[j >> 2] | 0) == (i | 0))
																		c[j >> 2] = K;
																	else
																		c[d + 20 >> 2] = K;
																	if (!K)
																		break i
																} else {
																	c[h >> 2] = K;
																	if (K)
																		break;
																	c[1167] = c[1167] & ~(1 << j);
																	break i
																}
															while (0);
															h = c[1170] | 0;
															if (K >>> 0 < h >>> 0)
																ya();
															c[K + 24 >> 2] = d;
															j = b | 16;
															i = c[x + (j + a) >> 2] | 0;
															do
																if (i)
																	if (i >>> 0 < h >>> 0)
																		ya();
																	else {
																		c[K + 16 >> 2] = i;
																		c[i + 24 >> 2] = K;
																		break
																	}
															while (0);
															i = c[x + (l + j) >> 2] | 0;
															if (!i)
																break;
															if (i >>> 0 < (c[1170] | 0) >>> 0)
																ya();
															else {
																c[K + 20 >> 2] = i;
																c[i + 24 >> 2] = K;
																break
															}
														} else {
															g = c[x + ((b | 8) + a) >> 2] | 0;
															f = c[x + (a + 12 + b) >> 2] | 0;
															h = 4704 + (e << 1 << 2) | 0;
															do
																if ((g | 0) != (h | 0)) {
																	if (g >>> 0 < j >>> 0)
																		ya();
																	if ((c[g + 12 >> 2] | 0) == (i | 0))
																		break;
																	ya();
																}
															while (0);
															if ((f | 0) == (g | 0)) {
																c[1166] = c[1166] & ~(1 << e);
																break
															}
															do
																if ((f | 0) == (h | 0))
																	G = f + 8 | 0;
																else {
																	if (f >>> 0 < j >>> 0)
																		ya();
																	j = f + 8 | 0;
																	if ((c[j >> 2] | 0) == (i | 0)) {
																		G = j;
																		break
																	}
																	ya();
																}
															while (0);
															c[g + 12 >> 2] = f;
															c[G >> 2] = g
														}
													while (0);
													i = x + ((k | b) + a) | 0;
													j = k + m | 0
												} else
													j = m;
												i = i + 4 | 0;
												c[i >> 2] = c[i >> 2] & -2;
												c[x + (o + 4) >> 2] = j | 1;
												c[x + (j + o) >> 2] = j;
												i = j >>> 3;
												if (j >>> 0 < 256) {
													h = i << 1;
													f = 4704 + (h << 2) | 0;
													g = c[1166] | 0;
													i = 1 << i;
													do
														if (!(g & i)) {
															c[1166] = g | i;
															L = 4704 + (h + 2 << 2) | 0;
															M = f
														} else {
															i = 4704 + (h + 2 << 2) | 0;
															h = c[i >> 2] | 0;
															if (h >>> 0 >= (c[1170] | 0) >>> 0) {
																L = i;
																M = h;
																break
															}
															ya();
														}
													while (0);
													c[L >> 2] = q;
													c[M + 12 >> 2] = q;
													c[x + (o + 8) >> 2] = M;
													c[x + (o + 12) >> 2] = f;
													break
												}
												d = j >>> 8;
												do
													if (!d)
														f = 0;
													else {
														if (j >>> 0 > 16777215) {
															f = 31;
															break
														}
														L = (d + 1048320 | 0) >>> 16 & 8;
														M = d << L;
														K = (M + 520192 | 0) >>> 16 & 4;
														M = M << K;
														f = (M + 245760 | 0) >>> 16 & 2;
														f = 14 - (K | L | f) + (M << f >>> 15) | 0;
														f = j >>> (f + 7 | 0) & 1 | f << 1
													}
												while (0);
												i = 4968 + (f << 2) | 0;
												c[x + (o + 28) >> 2] = f;
												c[x + (o + 20) >> 2] = 0;
												c[x + (o + 16) >> 2] = 0;
												h = c[1167] | 0;
												g = 1 << f;
												if (!(h & g)) {
													c[1167] = h | g;
													c[i >> 2] = q;
													c[x + (o + 24) >> 2] = i;
													c[x + (o + 12) >> 2] = q;
													c[x + (o + 8) >> 2] = q;
													break
												}
												d = c[i >> 2] | 0;
												j: do
													if ((c[d + 4 >> 2] & -8 | 0) != (j | 0)) {
														h = j << ((f | 0) == 31 ? 0 : 25 - (f >>> 1) | 0);
														while (1) {
															b = d + 16 + (h >>> 31 << 2) | 0;
															i = c[b >> 2] | 0;
															if (!i)
																break;
															if ((c[i + 4 >> 2] & -8 | 0) == (j | 0)) {
																N = i;
																break j
															} else {
																h = h << 1;
																d = i
															}
														}
														if (b >>> 0 < (c[1170] | 0) >>> 0)
															ya();
														else {
															c[b >> 2] = q;
															c[x + (o + 24) >> 2] = d;
															c[x + (o + 12) >> 2] = q;
															c[x + (o + 8) >> 2] = q;
															break h
														}
													} else
														N = d;
												while (0);
												d = N + 8 | 0;
												b = c[d >> 2] | 0;
												M = c[1170] | 0;
												if (b >>> 0 >= M >>> 0 & N >>> 0 >= M >>> 0) {
													c[b + 12 >> 2] = q;
													c[d >> 2] = q;
													c[x + (o + 8) >> 2] = b;
													c[x + (o + 12) >> 2] = N;
													c[x + (o + 24) >> 2] = 0;
													break
												} else
													ya();
											} else {
												N = (c[1169] | 0) + m | 0;
												c[1169] = N;
												c[1172] = q;
												c[x + (o + 4) >> 2] = N | 1
											}
										while (0);
										N = x + (p | 8) | 0;
										return N | 0
									} else
										g = 5112;
								while (1) {
									h = c[g >> 2] | 0;
									if (h >>> 0 <= n >>> 0 ? (i = c[g + 4 >> 2] | 0, f = h + i | 0, f >>> 0 > n >>> 0) : 0)
										break;
									g = c[g + 8 >> 2] | 0
								}
								j = h + (i + -39) | 0;
								h = h + (i + -47 + ((j & 7 | 0) == 0 ? 0 : 0 - j & 7)) | 0;
								j = n + 16 | 0;
								h = h >>> 0 < j >>> 0 ? n : h;
								i = h + 8 | 0;
								g = x + 8 | 0;
								g = (g & 7 | 0) == 0 ? 0 : 0 - g & 7;
								N = a + -40 - g | 0;
								c[1172] = x + g;
								c[1169] = N;
								c[x + (g + 4) >> 2] = N | 1;
								c[x + (a + -36) >> 2] = 40;
								c[1173] = c[1288];
								g = h + 4 | 0;
								c[g >> 2] = 27;
								c[i >> 2] = c[1278];
								c[i + 4 >> 2] = c[1279];
								c[i + 8 >> 2] = c[1280];
								c[i + 12 >> 2] = c[1281];
								c[1278] = x;
								c[1279] = a;
								c[1281] = 0;
								c[1280] = i;
								i = h + 28 | 0;
								c[i >> 2] = 7;
								if ((h + 32 | 0) >>> 0 < f >>> 0)
									do {
										N = i;
										i = i + 4 | 0;
										c[i >> 2] = 7
									} while ((N + 8 | 0) >>> 0 < f >>> 0);
								if ((h | 0) != (n | 0)) {
									f = h - n | 0;
									c[g >> 2] = c[g >> 2] & -2;
									c[n + 4 >> 2] = f | 1;
									c[h >> 2] = f;
									i = f >>> 3;
									if (f >>> 0 < 256) {
										h = i << 1;
										f = 4704 + (h << 2) | 0;
										g = c[1166] | 0;
										i = 1 << i;
										if (g & i) {
											d = 4704 + (h + 2 << 2) | 0;
											b = c[d >> 2] | 0;
											if (b >>> 0 < (c[1170] | 0) >>> 0)
												ya();
											else {
												H = d;
												I = b
											}
										} else {
											c[1166] = g | i;
											H = 4704 + (h + 2 << 2) | 0;
											I = f
										}
										c[H >> 2] = n;
										c[I + 12 >> 2] = n;
										c[n + 8 >> 2] = I;
										c[n + 12 >> 2] = f;
										break
									}
									d = f >>> 8;
									if (d)
										if (f >>> 0 > 16777215)
											h = 31;
										else {
											M = (d + 1048320 | 0) >>> 16 & 8;
											N = d << M;
											L = (N + 520192 | 0) >>> 16 & 4;
											N = N << L;
											h = (N + 245760 | 0) >>> 16 & 2;
											h = 14 - (L | M | h) + (N << h >>> 15) | 0;
											h = f >>> (h + 7 | 0) & 1 | h << 1
										}
									else
										h = 0;
									i = 4968 + (h << 2) | 0;
									c[n + 28 >> 2] = h;
									c[n + 20 >> 2] = 0;
									c[j >> 2] = 0;
									d = c[1167] | 0;
									b = 1 << h;
									if (!(d & b)) {
										c[1167] = d | b;
										c[i >> 2] = n;
										c[n + 24 >> 2] = i;
										c[n + 12 >> 2] = n;
										c[n + 8 >> 2] = n;
										break
									}
									d = c[i >> 2] | 0;
									k: do
										if ((c[d + 4 >> 2] & -8 | 0) != (f | 0)) {
											i = f << ((h | 0) == 31 ? 0 : 25 - (h >>> 1) | 0);
											while (1) {
												b = d + 16 + (i >>> 31 << 2) | 0;
												e = c[b >> 2] | 0;
												if (!e)
													break;
												if ((c[e + 4 >> 2] & -8 | 0) == (f | 0)) {
													J = e;
													break k
												} else {
													i = i << 1;
													d = e
												}
											}
											if (b >>> 0 < (c[1170] | 0) >>> 0)
												ya();
											else {
												c[b >> 2] = n;
												c[n + 24 >> 2] = d;
												c[n + 12 >> 2] = n;
												c[n + 8 >> 2] = n;
												break g
											}
										} else
											J = d;
									while (0);
									d = J + 8 | 0;
									b = c[d >> 2] | 0;
									N = c[1170] | 0;
									if (b >>> 0 >= N >>> 0 & J >>> 0 >= N >>> 0) {
										c[b + 12 >> 2] = n;
										c[d >> 2] = n;
										c[n + 8 >> 2] = b;
										c[n + 12 >> 2] = J;
										c[n + 24 >> 2] = 0;
										break
									} else
										ya();
								}
							} else {
								N = c[1170] | 0;
								if ((N | 0) == 0 | x >>> 0 < N >>> 0)
									c[1170] = x;
								c[1278] = x;
								c[1279] = a;
								c[1281] = 0;
								c[1175] = c[1284];
								c[1174] = -1;
								d = 0;
								do {
									N = d << 1;
									M = 4704 + (N << 2) | 0;
									c[4704 + (N + 3 << 2) >> 2] = M;
									c[4704 + (N + 2 << 2) >> 2] = M;
									d = d + 1 | 0
								} while ((d | 0) != 32);
								N = x + 8 | 0;
								N = (N & 7 | 0) == 0 ? 0 : 0 - N & 7;
								M = a + -40 - N | 0;
								c[1172] = x + N;
								c[1169] = M;
								c[x + (N + 4) >> 2] = M | 1;
								c[x + (a + -36) >> 2] = 40;
								c[1173] = c[1288]
							}
						while (0);
						b = c[1169] | 0;
						if (b >>> 0 > z >>> 0) {
							M = b - z | 0;
							c[1169] = M;
							N = c[1172] | 0;
							c[1172] = N + z;
							c[N + (z + 4) >> 2] = M | 1;
							c[N + 4 >> 2] = z | 3;
							N = N + 8 | 0;
							return N | 0
						}
					}
					c[(wa() | 0) >> 2] = 12;
					N = 0;
					return N | 0
				}
				function Hb(a) {
					a = a | 0;
					var b = 0,
					d = 0,
					e = 0,
					f = 0,
					g = 0,
					h = 0,
					i = 0,
					j = 0,
					k = 0,
					l = 0,
					m = 0,
					n = 0,
					o = 0,
					p = 0,
					q = 0,
					r = 0,
					s = 0,
					t = 0,
					u = 0;
					if (!a)
						return;
					g = a + -8 | 0;
					h = c[1170] | 0;
					if (g >>> 0 < h >>> 0)
						ya();
					f = c[a + -4 >> 2] | 0;
					e = f & 3;
					if ((e | 0) == 1)
						ya();
					o = f & -8;
					q = a + (o + -8) | 0;
					do
						if (!(f & 1)) {
							g = c[g >> 2] | 0;
							if (!e)
								return;
							i = -8 - g | 0;
							l = a + i | 0;
							m = g + o | 0;
							if (l >>> 0 < h >>> 0)
								ya();
							if ((l | 0) == (c[1171] | 0)) {
								g = a + (o + -4) | 0;
								f = c[g >> 2] | 0;
								if ((f & 3 | 0) != 3) {
									u = l;
									k = m;
									break
								}
								c[1168] = m;
								c[g >> 2] = f & -2;
								c[a + (i + 4) >> 2] = m | 1;
								c[q >> 2] = m;
								return
							}
							d = g >>> 3;
							if (g >>> 0 < 256) {
								e = c[a + (i + 8) >> 2] | 0;
								f = c[a + (i + 12) >> 2] | 0;
								g = 4704 + (d << 1 << 2) | 0;
								if ((e | 0) != (g | 0)) {
									if (e >>> 0 < h >>> 0)
										ya();
									if ((c[e + 12 >> 2] | 0) != (l | 0))
										ya();
								}
								if ((f | 0) == (e | 0)) {
									c[1166] = c[1166] & ~(1 << d);
									u = l;
									k = m;
									break
								}
								if ((f | 0) != (g | 0)) {
									if (f >>> 0 < h >>> 0)
										ya();
									g = f + 8 | 0;
									if ((c[g >> 2] | 0) == (l | 0))
										b = g;
									else
										ya();
								} else
									b = f + 8 | 0;
								c[e + 12 >> 2] = f;
								c[b >> 2] = e;
								u = l;
								k = m;
								break
							}
							b = c[a + (i + 24) >> 2] | 0;
							e = c[a + (i + 12) >> 2] | 0;
							do
								if ((e | 0) == (l | 0)) {
									f = a + (i + 20) | 0;
									g = c[f >> 2] | 0;
									if (!g) {
										f = a + (i + 16) | 0;
										g = c[f >> 2] | 0;
										if (!g) {
											j = 0;
											break
										}
									}
									while (1) {
										e = g + 20 | 0;
										d = c[e >> 2] | 0;
										if (d) {
											g = d;
											f = e;
											continue
										}
										e = g + 16 | 0;
										d = c[e >> 2] | 0;
										if (!d)
											break;
										else {
											g = d;
											f = e
										}
									}
									if (f >>> 0 < h >>> 0)
										ya();
									else {
										c[f >> 2] = 0;
										j = g;
										break
									}
								} else {
									d = c[a + (i + 8) >> 2] | 0;
									if (d >>> 0 < h >>> 0)
										ya();
									g = d + 12 | 0;
									if ((c[g >> 2] | 0) != (l | 0))
										ya();
									f = e + 8 | 0;
									if ((c[f >> 2] | 0) == (l | 0)) {
										c[g >> 2] = e;
										c[f >> 2] = d;
										j = e;
										break
									} else
										ya();
								}
							while (0);
							if (b) {
								g = c[a + (i + 28) >> 2] | 0;
								f = 4968 + (g << 2) | 0;
								if ((l | 0) == (c[f >> 2] | 0)) {
									c[f >> 2] = j;
									if (!j) {
										c[1167] = c[1167] & ~(1 << g);
										u = l;
										k = m;
										break
									}
								} else {
									if (b >>> 0 < (c[1170] | 0) >>> 0)
										ya();
									g = b + 16 | 0;
									if ((c[g >> 2] | 0) == (l | 0))
										c[g >> 2] = j;
									else
										c[b + 20 >> 2] = j;
									if (!j) {
										u = l;
										k = m;
										break
									}
								}
								f = c[1170] | 0;
								if (j >>> 0 < f >>> 0)
									ya();
								c[j + 24 >> 2] = b;
								g = c[a + (i + 16) >> 2] | 0;
								do
									if (g)
										if (g >>> 0 < f >>> 0)
											ya();
										else {
											c[j + 16 >> 2] = g;
											c[g + 24 >> 2] = j;
											break
										}
								while (0);
								g = c[a + (i + 20) >> 2] | 0;
								if (g)
									if (g >>> 0 < (c[1170] | 0) >>> 0)
										ya();
									else {
										c[j + 20 >> 2] = g;
										c[g + 24 >> 2] = j;
										u = l;
										k = m;
										break
									}
								else {
									u = l;
									k = m
								}
							} else {
								u = l;
								k = m
							}
						} else {
							u = g;
							k = o
						}
					while (0);
					if (u >>> 0 >= q >>> 0)
						ya();
					g = a + (o + -4) | 0;
					f = c[g >> 2] | 0;
					if (!(f & 1))
						ya();
					if (!(f & 2)) {
						if ((q | 0) == (c[1172] | 0)) {
							t = (c[1169] | 0) + k | 0;
							c[1169] = t;
							c[1172] = u;
							c[u + 4 >> 2] = t | 1;
							if ((u | 0) != (c[1171] | 0))
								return;
							c[1171] = 0;
							c[1168] = 0;
							return
						}
						if ((q | 0) == (c[1171] | 0)) {
							t = (c[1168] | 0) + k | 0;
							c[1168] = t;
							c[1171] = u;
							c[u + 4 >> 2] = t | 1;
							c[u + t >> 2] = t;
							return
						}
						h = (f & -8) + k | 0;
						b = f >>> 3;
						do
							if (f >>> 0 >= 256) {
								b = c[a + (o + 16) >> 2] | 0;
								g = c[a + (o | 4) >> 2] | 0;
								do
									if ((g | 0) == (q | 0)) {
										f = a + (o + 12) | 0;
										g = c[f >> 2] | 0;
										if (!g) {
											f = a + (o + 8) | 0;
											g = c[f >> 2] | 0;
											if (!g) {
												p = 0;
												break
											}
										}
										while (1) {
											e = g + 20 | 0;
											d = c[e >> 2] | 0;
											if (d) {
												g = d;
												f = e;
												continue
											}
											e = g + 16 | 0;
											d = c[e >> 2] | 0;
											if (!d)
												break;
											else {
												g = d;
												f = e
											}
										}
										if (f >>> 0 < (c[1170] | 0) >>> 0)
											ya();
										else {
											c[f >> 2] = 0;
											p = g;
											break
										}
									} else {
										f = c[a + o >> 2] | 0;
										if (f >>> 0 < (c[1170] | 0) >>> 0)
											ya();
										e = f + 12 | 0;
										if ((c[e >> 2] | 0) != (q | 0))
											ya();
										d = g + 8 | 0;
										if ((c[d >> 2] | 0) == (q | 0)) {
											c[e >> 2] = g;
											c[d >> 2] = f;
											p = g;
											break
										} else
											ya();
									}
								while (0);
								if (b) {
									g = c[a + (o + 20) >> 2] | 0;
									f = 4968 + (g << 2) | 0;
									if ((q | 0) == (c[f >> 2] | 0)) {
										c[f >> 2] = p;
										if (!p) {
											c[1167] = c[1167] & ~(1 << g);
											break
										}
									} else {
										if (b >>> 0 < (c[1170] | 0) >>> 0)
											ya();
										g = b + 16 | 0;
										if ((c[g >> 2] | 0) == (q | 0))
											c[g >> 2] = p;
										else
											c[b + 20 >> 2] = p;
										if (!p)
											break
									}
									g = c[1170] | 0;
									if (p >>> 0 < g >>> 0)
										ya();
									c[p + 24 >> 2] = b;
									f = c[a + (o + 8) >> 2] | 0;
									do
										if (f)
											if (f >>> 0 < g >>> 0)
												ya();
											else {
												c[p + 16 >> 2] = f;
												c[f + 24 >> 2] = p;
												break
											}
									while (0);
									d = c[a + (o + 12) >> 2] | 0;
									if (d)
										if (d >>> 0 < (c[1170] | 0) >>> 0)
											ya();
										else {
											c[p + 20 >> 2] = d;
											c[d + 24 >> 2] = p;
											break
										}
								}
							} else {
								d = c[a + o >> 2] | 0;
								e = c[a + (o | 4) >> 2] | 0;
								g = 4704 + (b << 1 << 2) | 0;
								if ((d | 0) != (g | 0)) {
									if (d >>> 0 < (c[1170] | 0) >>> 0)
										ya();
									if ((c[d + 12 >> 2] | 0) != (q | 0))
										ya();
								}
								if ((e | 0) == (d | 0)) {
									c[1166] = c[1166] & ~(1 << b);
									break
								}
								if ((e | 0) != (g | 0)) {
									if (e >>> 0 < (c[1170] | 0) >>> 0)
										ya();
									f = e + 8 | 0;
									if ((c[f >> 2] | 0) == (q | 0))
										n = f;
									else
										ya();
								} else
									n = e + 8 | 0;
								c[d + 12 >> 2] = e;
								c[n >> 2] = d
							}
						while (0);
						c[u + 4 >> 2] = h | 1;
						c[u + h >> 2] = h;
						if ((u | 0) == (c[1171] | 0)) {
							c[1168] = h;
							return
						} else
							g = h
					} else {
						c[g >> 2] = f & -2;
						c[u + 4 >> 2] = k | 1;
						c[u + k >> 2] = k;
						g = k
					}
					f = g >>> 3;
					if (g >>> 0 < 256) {
						e = f << 1;
						g = 4704 + (e << 2) | 0;
						b = c[1166] | 0;
						d = 1 << f;
						if (b & d) {
							d = 4704 + (e + 2 << 2) | 0;
							b = c[d >> 2] | 0;
							if (b >>> 0 < (c[1170] | 0) >>> 0)
								ya();
							else {
								r = d;
								s = b
							}
						} else {
							c[1166] = b | d;
							r = 4704 + (e + 2 << 2) | 0;
							s = g
						}
						c[r >> 2] = u;
						c[s + 12 >> 2] = u;
						c[u + 8 >> 2] = s;
						c[u + 12 >> 2] = g;
						return
					}
					b = g >>> 8;
					if (b)
						if (g >>> 0 > 16777215)
							f = 31;
						else {
							r = (b + 1048320 | 0) >>> 16 & 8;
							s = b << r;
							q = (s + 520192 | 0) >>> 16 & 4;
							s = s << q;
							f = (s + 245760 | 0) >>> 16 & 2;
							f = 14 - (q | r | f) + (s << f >>> 15) | 0;
							f = g >>> (f + 7 | 0) & 1 | f << 1
						}
					else
						f = 0;
					d = 4968 + (f << 2) | 0;
					c[u + 28 >> 2] = f;
					c[u + 20 >> 2] = 0;
					c[u + 16 >> 2] = 0;
					b = c[1167] | 0;
					e = 1 << f;
					a: do
						if (b & e) {
							d = c[d >> 2] | 0;
							b: do
								if ((c[d + 4 >> 2] & -8 | 0) != (g | 0)) {
									f = g << ((f | 0) == 31 ? 0 : 25 - (f >>> 1) | 0);
									while (1) {
										b = d + 16 + (f >>> 31 << 2) | 0;
										e = c[b >> 2] | 0;
										if (!e)
											break;
										if ((c[e + 4 >> 2] & -8 | 0) == (g | 0)) {
											t = e;
											break b
										} else {
											f = f << 1;
											d = e
										}
									}
									if (b >>> 0 < (c[1170] | 0) >>> 0)
										ya();
									else {
										c[b >> 2] = u;
										c[u + 24 >> 2] = d;
										c[u + 12 >> 2] = u;
										c[u + 8 >> 2] = u;
										break a
									}
								} else
									t = d;
							while (0);
							b = t + 8 | 0;
							d = c[b >> 2] | 0;
							s = c[1170] | 0;
							if (d >>> 0 >= s >>> 0 & t >>> 0 >= s >>> 0) {
								c[d + 12 >> 2] = u;
								c[b >> 2] = u;
								c[u + 8 >> 2] = d;
								c[u + 12 >> 2] = t;
								c[u + 24 >> 2] = 0;
								break
							} else
								ya();
						} else {
							c[1167] = b | e;
							c[d >> 2] = u;
							c[u + 24 >> 2] = d;
							c[u + 12 >> 2] = u;
							c[u + 8 >> 2] = u
						}
					while (0);
					u = (c[1174] | 0) + -1 | 0;
					c[1174] = u;
					if (!u)
						b = 5120;
					else
						return;
					while (1) {
						b = c[b >> 2] | 0;
						if (!b)
							break;
						else
							b = b + 8 | 0
					}
					c[1174] = -1;
					return
				}
				function Ib(a, b) {
					a = a | 0;
					b = b | 0;
					var d = 0,
					e = 0;
					if (!a) {
						a = Gb(b) | 0;
						return a | 0
					}
					if (b >>> 0 > 4294967231) {
						c[(wa() | 0) >> 2] = 12;
						a = 0;
						return a | 0
					}
					d = Jb(a + -8 | 0, b >>> 0 < 11 ? 16 : b + 11 & -8) | 0;
					if (d) {
						a = d + 8 | 0;
						return a | 0
					}
					d = Gb(b) | 0;
					if (!d) {
						a = 0;
						return a | 0
					}
					e = c[a + -4 >> 2] | 0;
					e = (e & -8) - ((e & 3 | 0) == 0 ? 8 : 4) | 0;
					Ob(d | 0, a | 0, (e >>> 0 < b >>> 0 ? e : b) | 0) | 0;
					Hb(a);
					a = d;
					return a | 0
				}
				function Jb(a, b) {
					a = a | 0;
					b = b | 0;
					var d = 0,
					e = 0,
					f = 0,
					g = 0,
					h = 0,
					i = 0,
					j = 0,
					k = 0,
					l = 0,
					m = 0,
					n = 0,
					o = 0,
					p = 0;
					o = a + 4 | 0;
					p = c[o >> 2] | 0;
					j = p & -8;
					l = a + j | 0;
					i = c[1170] | 0;
					e = p & 3;
					if (!((e | 0) != 1 & a >>> 0 >= i >>> 0 & a >>> 0 < l >>> 0))
						ya();
					d = a + (j | 4) | 0;
					g = c[d >> 2] | 0;
					if (!(g & 1))
						ya();
					if (!e) {
						if (b >>> 0 < 256) {
							a = 0;
							return a | 0
						}
						if (j >>> 0 >= (b + 4 | 0) >>> 0 ? (j - b | 0) >>> 0 <= c[1286] << 1 >>> 0 : 0)
							return a | 0;
						a = 0;
						return a | 0
					}
					if (j >>> 0 >= b >>> 0) {
						e = j - b | 0;
						if (e >>> 0 <= 15)
							return a | 0;
						c[o >> 2] = p & 1 | b | 2;
						c[a + (b + 4) >> 2] = e | 3;
						c[d >> 2] = c[d >> 2] | 1;
						Kb(a + b | 0, e);
						return a | 0
					}
					if ((l | 0) == (c[1172] | 0)) {
						e = (c[1169] | 0) + j | 0;
						if (e >>> 0 <= b >>> 0) {
							a = 0;
							return a | 0
						}
						n = e - b | 0;
						c[o >> 2] = p & 1 | b | 2;
						c[a + (b + 4) >> 2] = n | 1;
						c[1172] = a + b;
						c[1169] = n;
						return a | 0
					}
					if ((l | 0) == (c[1171] | 0)) {
						e = (c[1168] | 0) + j | 0;
						if (e >>> 0 < b >>> 0) {
							a = 0;
							return a | 0
						}
						d = e - b | 0;
						if (d >>> 0 > 15) {
							c[o >> 2] = p & 1 | b | 2;
							c[a + (b + 4) >> 2] = d | 1;
							c[a + e >> 2] = d;
							e = a + (e + 4) | 0;
							c[e >> 2] = c[e >> 2] & -2;
							e = a + b | 0
						} else {
							c[o >> 2] = p & 1 | e | 2;
							e = a + (e + 4) | 0;
							c[e >> 2] = c[e >> 2] | 1;
							e = 0;
							d = 0
						}
						c[1168] = d;
						c[1171] = e;
						return a | 0
					}
					if (g & 2) {
						a = 0;
						return a | 0
					}
					m = (g & -8) + j | 0;
					if (m >>> 0 < b >>> 0) {
						a = 0;
						return a | 0
					}
					n = m - b | 0;
					f = g >>> 3;
					do
						if (g >>> 0 >= 256) {
							h = c[a + (j + 24) >> 2] | 0;
							g = c[a + (j + 12) >> 2] | 0;
							do
								if ((g | 0) == (l | 0)) {
									d = a + (j + 20) | 0;
									e = c[d >> 2] | 0;
									if (!e) {
										d = a + (j + 16) | 0;
										e = c[d >> 2] | 0;
										if (!e) {
											k = 0;
											break
										}
									}
									while (1) {
										f = e + 20 | 0;
										g = c[f >> 2] | 0;
										if (g) {
											e = g;
											d = f;
											continue
										}
										g = e + 16 | 0;
										f = c[g >> 2] | 0;
										if (!f)
											break;
										else {
											e = f;
											d = g
										}
									}
									if (d >>> 0 < i >>> 0)
										ya();
									else {
										c[d >> 2] = 0;
										k = e;
										break
									}
								} else {
									f = c[a + (j + 8) >> 2] | 0;
									if (f >>> 0 < i >>> 0)
										ya();
									e = f + 12 | 0;
									if ((c[e >> 2] | 0) != (l | 0))
										ya();
									d = g + 8 | 0;
									if ((c[d >> 2] | 0) == (l | 0)) {
										c[e >> 2] = g;
										c[d >> 2] = f;
										k = g;
										break
									} else
										ya();
								}
							while (0);
							if (h) {
								e = c[a + (j + 28) >> 2] | 0;
								d = 4968 + (e << 2) | 0;
								if ((l | 0) == (c[d >> 2] | 0)) {
									c[d >> 2] = k;
									if (!k) {
										c[1167] = c[1167] & ~(1 << e);
										break
									}
								} else {
									if (h >>> 0 < (c[1170] | 0) >>> 0)
										ya();
									e = h + 16 | 0;
									if ((c[e >> 2] | 0) == (l | 0))
										c[e >> 2] = k;
									else
										c[h + 20 >> 2] = k;
									if (!k)
										break
								}
								d = c[1170] | 0;
								if (k >>> 0 < d >>> 0)
									ya();
								c[k + 24 >> 2] = h;
								e = c[a + (j + 16) >> 2] | 0;
								do
									if (e)
										if (e >>> 0 < d >>> 0)
											ya();
										else {
											c[k + 16 >> 2] = e;
											c[e + 24 >> 2] = k;
											break
										}
								while (0);
								e = c[a + (j + 20) >> 2] | 0;
								if (e)
									if (e >>> 0 < (c[1170] | 0) >>> 0)
										ya();
									else {
										c[k + 20 >> 2] = e;
										c[e + 24 >> 2] = k;
										break
									}
							}
						} else {
							g = c[a + (j + 8) >> 2] | 0;
							d = c[a + (j + 12) >> 2] | 0;
							e = 4704 + (f << 1 << 2) | 0;
							if ((g | 0) != (e | 0)) {
								if (g >>> 0 < i >>> 0)
									ya();
								if ((c[g + 12 >> 2] | 0) != (l | 0))
									ya();
							}
							if ((d | 0) == (g | 0)) {
								c[1166] = c[1166] & ~(1 << f);
								break
							}
							if ((d | 0) != (e | 0)) {
								if (d >>> 0 < i >>> 0)
									ya();
								e = d + 8 | 0;
								if ((c[e >> 2] | 0) == (l | 0))
									h = e;
								else
									ya();
							} else
								h = d + 8 | 0;
							c[g + 12 >> 2] = d;
							c[h >> 2] = g
						}
					while (0);
					if (n >>> 0 < 16) {
						c[o >> 2] = m | p & 1 | 2;
						b = a + (m | 4) | 0;
						c[b >> 2] = c[b >> 2] | 1;
						return a | 0
					} else {
						c[o >> 2] = p & 1 | b | 2;
						c[a + (b + 4) >> 2] = n | 3;
						p = a + (m | 4) | 0;
						c[p >> 2] = c[p >> 2] | 1;
						Kb(a + b | 0, n);
						return a | 0
					}
					return 0
				}
				function Kb(a, b) {
					a = a | 0;
					b = b | 0;
					var d = 0,
					e = 0,
					f = 0,
					g = 0,
					h = 0,
					i = 0,
					j = 0,
					k = 0,
					l = 0,
					m = 0,
					n = 0,
					o = 0,
					p = 0,
					q = 0,
					r = 0,
					s = 0,
					t = 0;
					q = a + b | 0;
					h = c[a + 4 >> 2] | 0;
					do
						if (!(h & 1)) {
							j = c[a >> 2] | 0;
							if (!(h & 3))
								return;
							n = a + (0 - j) | 0;
							m = j + b | 0;
							i = c[1170] | 0;
							if (n >>> 0 < i >>> 0)
								ya();
							if ((n | 0) == (c[1171] | 0)) {
								g = a + (b + 4) | 0;
								h = c[g >> 2] | 0;
								if ((h & 3 | 0) != 3) {
									t = n;
									l = m;
									break
								}
								c[1168] = m;
								c[g >> 2] = h & -2;
								c[a + (4 - j) >> 2] = m | 1;
								c[q >> 2] = m;
								return
							}
							e = j >>> 3;
							if (j >>> 0 < 256) {
								f = c[a + (8 - j) >> 2] | 0;
								g = c[a + (12 - j) >> 2] | 0;
								h = 4704 + (e << 1 << 2) | 0;
								if ((f | 0) != (h | 0)) {
									if (f >>> 0 < i >>> 0)
										ya();
									if ((c[f + 12 >> 2] | 0) != (n | 0))
										ya();
								}
								if ((g | 0) == (f | 0)) {
									c[1166] = c[1166] & ~(1 << e);
									t = n;
									l = m;
									break
								}
								if ((g | 0) != (h | 0)) {
									if (g >>> 0 < i >>> 0)
										ya();
									h = g + 8 | 0;
									if ((c[h >> 2] | 0) == (n | 0))
										d = h;
									else
										ya();
								} else
									d = g + 8 | 0;
								c[f + 12 >> 2] = g;
								c[d >> 2] = f;
								t = n;
								l = m;
								break
							}
							d = c[a + (24 - j) >> 2] | 0;
							f = c[a + (12 - j) >> 2] | 0;
							do
								if ((f | 0) == (n | 0)) {
									f = 16 - j | 0;
									g = a + (f + 4) | 0;
									h = c[g >> 2] | 0;
									if (!h) {
										g = a + f | 0;
										h = c[g >> 2] | 0;
										if (!h) {
											k = 0;
											break
										}
									}
									while (1) {
										f = h + 20 | 0;
										e = c[f >> 2] | 0;
										if (e) {
											h = e;
											g = f;
											continue
										}
										f = h + 16 | 0;
										e = c[f >> 2] | 0;
										if (!e)
											break;
										else {
											h = e;
											g = f
										}
									}
									if (g >>> 0 < i >>> 0)
										ya();
									else {
										c[g >> 2] = 0;
										k = h;
										break
									}
								} else {
									e = c[a + (8 - j) >> 2] | 0;
									if (e >>> 0 < i >>> 0)
										ya();
									h = e + 12 | 0;
									if ((c[h >> 2] | 0) != (n | 0))
										ya();
									g = f + 8 | 0;
									if ((c[g >> 2] | 0) == (n | 0)) {
										c[h >> 2] = f;
										c[g >> 2] = e;
										k = f;
										break
									} else
										ya();
								}
							while (0);
							if (d) {
								h = c[a + (28 - j) >> 2] | 0;
								g = 4968 + (h << 2) | 0;
								if ((n | 0) == (c[g >> 2] | 0)) {
									c[g >> 2] = k;
									if (!k) {
										c[1167] = c[1167] & ~(1 << h);
										t = n;
										l = m;
										break
									}
								} else {
									if (d >>> 0 < (c[1170] | 0) >>> 0)
										ya();
									h = d + 16 | 0;
									if ((c[h >> 2] | 0) == (n | 0))
										c[h >> 2] = k;
									else
										c[d + 20 >> 2] = k;
									if (!k) {
										t = n;
										l = m;
										break
									}
								}
								f = c[1170] | 0;
								if (k >>> 0 < f >>> 0)
									ya();
								c[k + 24 >> 2] = d;
								h = 16 - j | 0;
								g = c[a + h >> 2] | 0;
								do
									if (g)
										if (g >>> 0 < f >>> 0)
											ya();
										else {
											c[k + 16 >> 2] = g;
											c[g + 24 >> 2] = k;
											break
										}
								while (0);
								h = c[a + (h + 4) >> 2] | 0;
								if (h)
									if (h >>> 0 < (c[1170] | 0) >>> 0)
										ya();
									else {
										c[k + 20 >> 2] = h;
										c[h + 24 >> 2] = k;
										t = n;
										l = m;
										break
									}
								else {
									t = n;
									l = m
								}
							} else {
								t = n;
								l = m
							}
						} else {
							t = a;
							l = b
						}
					while (0);
					i = c[1170] | 0;
					if (q >>> 0 < i >>> 0)
						ya();
					h = a + (b + 4) | 0;
					g = c[h >> 2] | 0;
					if (!(g & 2)) {
						if ((q | 0) == (c[1172] | 0)) {
							s = (c[1169] | 0) + l | 0;
							c[1169] = s;
							c[1172] = t;
							c[t + 4 >> 2] = s | 1;
							if ((t | 0) != (c[1171] | 0))
								return;
							c[1171] = 0;
							c[1168] = 0;
							return
						}
						if ((q | 0) == (c[1171] | 0)) {
							s = (c[1168] | 0) + l | 0;
							c[1168] = s;
							c[1171] = t;
							c[t + 4 >> 2] = s | 1;
							c[t + s >> 2] = s;
							return
						}
						j = (g & -8) + l | 0;
						d = g >>> 3;
						do
							if (g >>> 0 >= 256) {
								d = c[a + (b + 24) >> 2] | 0;
								f = c[a + (b + 12) >> 2] | 0;
								do
									if ((f | 0) == (q | 0)) {
										g = a + (b + 20) | 0;
										h = c[g >> 2] | 0;
										if (!h) {
											g = a + (b + 16) | 0;
											h = c[g >> 2] | 0;
											if (!h) {
												p = 0;
												break
											}
										}
										while (1) {
											f = h + 20 | 0;
											e = c[f >> 2] | 0;
											if (e) {
												h = e;
												g = f;
												continue
											}
											f = h + 16 | 0;
											e = c[f >> 2] | 0;
											if (!e)
												break;
											else {
												h = e;
												g = f
											}
										}
										if (g >>> 0 < i >>> 0)
											ya();
										else {
											c[g >> 2] = 0;
											p = h;
											break
										}
									} else {
										e = c[a + (b + 8) >> 2] | 0;
										if (e >>> 0 < i >>> 0)
											ya();
										h = e + 12 | 0;
										if ((c[h >> 2] | 0) != (q | 0))
											ya();
										g = f + 8 | 0;
										if ((c[g >> 2] | 0) == (q | 0)) {
											c[h >> 2] = f;
											c[g >> 2] = e;
											p = f;
											break
										} else
											ya();
									}
								while (0);
								if (d) {
									h = c[a + (b + 28) >> 2] | 0;
									g = 4968 + (h << 2) | 0;
									if ((q | 0) == (c[g >> 2] | 0)) {
										c[g >> 2] = p;
										if (!p) {
											c[1167] = c[1167] & ~(1 << h);
											break
										}
									} else {
										if (d >>> 0 < (c[1170] | 0) >>> 0)
											ya();
										g = d + 16 | 0;
										if ((c[g >> 2] | 0) == (q | 0))
											c[g >> 2] = p;
										else
											c[d + 20 >> 2] = p;
										if (!p)
											break
									}
									f = c[1170] | 0;
									if (p >>> 0 < f >>> 0)
										ya();
									c[p + 24 >> 2] = d;
									g = c[a + (b + 16) >> 2] | 0;
									do
										if (g)
											if (g >>> 0 < f >>> 0)
												ya();
											else {
												c[p + 16 >> 2] = g;
												c[g + 24 >> 2] = p;
												break
											}
									while (0);
									f = c[a + (b + 20) >> 2] | 0;
									if (f)
										if (f >>> 0 < (c[1170] | 0) >>> 0)
											ya();
										else {
											c[p + 20 >> 2] = f;
											c[f + 24 >> 2] = p;
											break
										}
								}
							} else {
								e = c[a + (b + 8) >> 2] | 0;
								f = c[a + (b + 12) >> 2] | 0;
								h = 4704 + (d << 1 << 2) | 0;
								if ((e | 0) != (h | 0)) {
									if (e >>> 0 < i >>> 0)
										ya();
									if ((c[e + 12 >> 2] | 0) != (q | 0))
										ya();
								}
								if ((f | 0) == (e | 0)) {
									c[1166] = c[1166] & ~(1 << d);
									break
								}
								if ((f | 0) != (h | 0)) {
									if (f >>> 0 < i >>> 0)
										ya();
									g = f + 8 | 0;
									if ((c[g >> 2] | 0) == (q | 0))
										o = g;
									else
										ya();
								} else
									o = f + 8 | 0;
								c[e + 12 >> 2] = f;
								c[o >> 2] = e
							}
						while (0);
						c[t + 4 >> 2] = j | 1;
						c[t + j >> 2] = j;
						if ((t | 0) == (c[1171] | 0)) {
							c[1168] = j;
							return
						} else
							h = j
					} else {
						c[h >> 2] = g & -2;
						c[t + 4 >> 2] = l | 1;
						c[t + l >> 2] = l;
						h = l
					}
					g = h >>> 3;
					if (h >>> 0 < 256) {
						e = g << 1;
						h = 4704 + (e << 2) | 0;
						d = c[1166] | 0;
						f = 1 << g;
						if (d & f) {
							f = 4704 + (e + 2 << 2) | 0;
							e = c[f >> 2] | 0;
							if (e >>> 0 < (c[1170] | 0) >>> 0)
								ya();
							else {
								r = f;
								s = e
							}
						} else {
							c[1166] = d | f;
							r = 4704 + (e + 2 << 2) | 0;
							s = h
						}
						c[r >> 2] = t;
						c[s + 12 >> 2] = t;
						c[t + 8 >> 2] = s;
						c[t + 12 >> 2] = h;
						return
					}
					d = h >>> 8;
					if (d)
						if (h >>> 0 > 16777215)
							g = 31;
						else {
							r = (d + 1048320 | 0) >>> 16 & 8;
							s = d << r;
							q = (s + 520192 | 0) >>> 16 & 4;
							s = s << q;
							g = (s + 245760 | 0) >>> 16 & 2;
							g = 14 - (q | r | g) + (s << g >>> 15) | 0;
							g = h >>> (g + 7 | 0) & 1 | g << 1
						}
					else
						g = 0;
					f = 4968 + (g << 2) | 0;
					c[t + 28 >> 2] = g;
					c[t + 20 >> 2] = 0;
					c[t + 16 >> 2] = 0;
					e = c[1167] | 0;
					d = 1 << g;
					if (!(e & d)) {
						c[1167] = e | d;
						c[f >> 2] = t;
						c[t + 24 >> 2] = f;
						c[t + 12 >> 2] = t;
						c[t + 8 >> 2] = t;
						return
					}
					d = c[f >> 2] | 0;
					a: do
						if ((c[d + 4 >> 2] & -8 | 0) != (h | 0)) {
							g = h << ((g | 0) == 31 ? 0 : 25 - (g >>> 1) | 0);
							while (1) {
								e = d + 16 + (g >>> 31 << 2) | 0;
								f = c[e >> 2] | 0;
								if (!f)
									break;
								if ((c[f + 4 >> 2] & -8 | 0) == (h | 0)) {
									d = f;
									break a
								} else {
									g = g << 1;
									d = f
								}
							}
							if (e >>> 0 < (c[1170] | 0) >>> 0)
								ya();
							c[e >> 2] = t;
							c[t + 24 >> 2] = d;
							c[t + 12 >> 2] = t;
							c[t + 8 >> 2] = t;
							return
						}
					while (0);
					e = d + 8 | 0;
					f = c[e >> 2] | 0;
					s = c[1170] | 0;
					if (!(f >>> 0 >= s >>> 0 & d >>> 0 >= s >>> 0))
						ya();
					c[f + 12 >> 2] = t;
					c[e >> 2] = t;
					c[t + 8 >> 2] = f;
					c[t + 12 >> 2] = d;
					c[t + 24 >> 2] = 0;
					return
				}
				function Lb() {}
				function Mb(b, d, e) {
					b = b | 0;
					d = d | 0;
					e = e | 0;
					var f = 0,
					g = 0,
					h = 0,
					i = 0;
					f = b + e | 0;
					if ((e | 0) >= 20) {
						d = d & 255;
						h = b & 3;
						i = d | d << 8 | d << 16 | d << 24;
						g = f & ~3;
						if (h) {
							h = b + 4 - h | 0;
							while ((b | 0) < (h | 0)) {
								a[b >> 0] = d;
								b = b + 1 | 0
							}
						}
						while ((b | 0) < (g | 0)) {
							c[b >> 2] = i;
							b = b + 4 | 0
						}
					}
					while ((b | 0) < (f | 0)) {
						a[b >> 0] = d;
						b = b + 1 | 0
					}
					return b - e | 0
				}
				function Nb(b) {
					b = b | 0;
					var c = 0;
					c = b;
					while (a[c >> 0] | 0)
						c = c + 1 | 0;
					return c - b | 0
				}
				function Ob(b, d, e) {
					b = b | 0;
					d = d | 0;
					e = e | 0;
					var f = 0;
					if ((e | 0) >= 4096)
						return na(b | 0, d | 0, e | 0) | 0;
					f = b | 0;
					if ((b & 3) == (d & 3)) {
						while (b & 3) {
							if (!e)
								return f | 0;
							a[b >> 0] = a[d >> 0] | 0;
							b = b + 1 | 0;
							d = d + 1 | 0;
							e = e - 1 | 0
						}
						while ((e | 0) >= 4) {
							c[b >> 2] = c[d >> 2];
							b = b + 4 | 0;
							d = d + 4 | 0;
							e = e - 4 | 0
						}
					}
					while ((e | 0) > 0) {
						a[b >> 0] = a[d >> 0] | 0;
						b = b + 1 | 0;
						d = d + 1 | 0;
						e = e - 1 | 0
					}
					return f | 0
				}
				function Pb(b, c, d) {
					b = b | 0;
					c = c | 0;
					d = d | 0;
					var e = 0;
					if ((c | 0) < (b | 0) & (b | 0) < (c + d | 0)) {
						e = b;
						c = c + d | 0;
						b = b + d | 0;
						while ((d | 0) > 0) {
							b = b - 1 | 0;
							c = c - 1 | 0;
							d = d - 1 | 0;
							a[b >> 0] = a[c >> 0] | 0
						}
						b = e
					} else
						Ob(b, c, d) | 0;
					return b | 0
				}
				function Qb(a, b, c, d, e) {
					a = a | 0;
					b = b | 0;
					c = c | 0;
					d = d | 0;
					e = e | 0;
					Ha[a & 7](b | 0, c | 0, d | 0, e | 0);
				}
				function Rb(a, b, c, d) {
					a = a | 0;
					b = b | 0;
					c = c | 0;
					d = d | 0;
					aa(0);
				}

				// EMSCRIPTEN_END_FUNCS
				var Ha = [Rb, gb, ib, nb, tb, Rb, Rb, Rb];
				return {
					_strlen: Nb,
					_free: Hb,
					_memmove: Pb,
					_memset: Mb,
					_malloc: Gb,
					_memcpy: Ob,
					_xsetup: Db,
					_xprocess: Eb,
					runPostSets: Lb,
					stackAlloc: Ia,
					stackSave: Ja,
					stackRestore: Ka,
					establishStackSpace: La,
					setThrew: Ma,
					setTempRet0: Pa,
					getTempRet0: Qa,
					dynCall_viiii: Qb
				}
			})

			// EMSCRIPTEN_END_ASM
			(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
			var _strlen = Module["_strlen"] = asm["_strlen"];
			var _free = Module["_free"] = asm["_free"];
			var runPostSets = Module["runPostSets"] = asm["runPostSets"];
			var _memmove = Module["_memmove"] = asm["_memmove"];
			var _memset = Module["_memset"] = asm["_memset"];
			var _malloc = Module["_malloc"] = asm["_malloc"];
			var _memcpy = Module["_memcpy"] = asm["_memcpy"];
			var _xsetup = Module["_xsetup"] = asm["_xsetup"];
			var _xprocess = Module["_xprocess"] = asm["_xprocess"];
			var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];
			Runtime.stackAlloc = asm["stackAlloc"];
			Runtime.stackSave = asm["stackSave"];
			Runtime.stackRestore = asm["stackRestore"];
			Runtime.establishStackSpace = asm["establishStackSpace"];
			Runtime.setTempRet0 = asm["setTempRet0"];
			Runtime.getTempRet0 = asm["getTempRet0"];
			var i64Math = null;
			function ExitStatus(status) {
				this.name = "ExitStatus";
				this.message = "Program terminated with exit(" + status + ")";
				this.status = status
			}
			ExitStatus.prototype = new Error;
			ExitStatus.prototype.constructor = ExitStatus;
			var initialStackTop;
			var preloadStartTime = null;
			var calledMain = false;
			dependenciesFulfilled = function runCaller() {
				if (!Module["calledRun"])
					run();
				if (!Module["calledRun"])
					dependenciesFulfilled = runCaller
			};
			Module["callMain"] = Module.callMain = function callMain(args) {
				assert(runDependencies == 0, "cannot call main when async dependencies remain! (listen on __ATMAIN__)");
				assert(__ATPRERUN__.length == 0, "cannot call main when preRun functions remain to be called");
				args = args || [];
				ensureInitRuntime();
				var argc = args.length + 1;
				function pad() {
					for (var i = 0; i < 4 - 1; i++) {
						argv.push(0)
					}
				}
				var argv = [allocate(intArrayFromString(Module["thisProgram"]), "i8", ALLOC_NORMAL)];
				pad();
				for (var i = 0; i < argc - 1; i = i + 1) {
					argv.push(allocate(intArrayFromString(args[i]), "i8", ALLOC_NORMAL));
					pad()
				}
				argv.push(0);
				argv = allocate(argv, "i32", ALLOC_NORMAL);
				initialStackTop = STACKTOP;
				try {
					var ret = Module["_main"](argc, argv, 0);
					exit(ret, true)
				} catch (e) {
					if (e instanceof ExitStatus) {
						return
					} else if (e == "SimulateInfiniteLoop") {
						Module["noExitRuntime"] = true;
						return
					} else {
						if (e && typeof e === "object" && e.stack)
							Module.printErr("exception thrown: " + [e, e.stack]);
						throw e
					}
				}
				finally {
					calledMain = true
				}
			};
			function run(args) {
				args = args || Module["arguments"];
				if (preloadStartTime === null)
					preloadStartTime = Date.now();
				if (runDependencies > 0) {
					return
				}
				preRun();
				if (runDependencies > 0)
					return;
				if (Module["calledRun"])
					return;
				function doRun() {
					if (Module["calledRun"])
						return;
					Module["calledRun"] = true;
					if (ABORT)
						return;
					ensureInitRuntime();
					preMain();
					if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
						Module.printErr("pre-main prep time: " + (Date.now() - preloadStartTime) + " ms")
					}
					if (Module["onRuntimeInitialized"])
						Module["onRuntimeInitialized"]();
					if (Module["_main"] && shouldRunNow)
						Module["callMain"](args);
					postRun()
				}
				if (Module["setStatus"]) {
					Module["setStatus"]("Running...");
					setTimeout((function () {
							setTimeout((function () {
									Module["setStatus"]("")
								}), 1);
							doRun()
						}), 1)
				} else {
					doRun()
				}
			}
			Module["run"] = Module.run = run;
			function exit(status, implicit) {
				if (implicit && Module["noExitRuntime"]) {
					return
				}
				if (Module["noExitRuntime"]) {}
				else {
					ABORT = true;
					EXITSTATUS = status;
					STACKTOP = initialStackTop;
					exitRuntime();
					if (Module["onExit"])
						Module["onExit"](status)
				}
				if (ENVIRONMENT_IS_NODE) {
					process["stdout"]["once"]("drain", (function () {
							process["exit"](status)
						}));
					console.log(" ");
					setTimeout((function () {
							process["exit"](status)
						}), 500)
				} else if (ENVIRONMENT_IS_SHELL && typeof quit === "function") {
					quit(status)
				}
				throw new ExitStatus(status)
			}
			Module["exit"] = Module.exit = exit;
			var abortDecorators = [];
			function abort(what) {
				if (what !== undefined) {
					Module.print(what);
					Module.printErr(what);
					what = JSON.stringify(what)
				} else {
					what = ""
				}
				ABORT = true;
				EXITSTATUS = 1;
				var extra = "\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.";
				var output = "abort(" + what + ") at " + stackTrace() + extra;
				if (abortDecorators) {
					abortDecorators.forEach((function (decorator) {
							output = decorator(output, what)
						}))
				}
				throw output
			}
			Module["abort"] = Module.abort = abort;
			if (Module["preInit"]) {
				if (typeof Module["preInit"] == "function")
					Module["preInit"] = [Module["preInit"]];
				while (Module["preInit"].length > 0) {
					Module["preInit"].pop()()
				}
			}
			var shouldRunNow = true;
			if (Module["noInitialRun"]) {
				shouldRunNow = false
			}
			run();

			// Configure count callback
			Module.onCounted = function(callback){
				Module.counted = callback || noop;
			};
			
			// Configure decoded callback
			Module.onDecoded = function(callback){
				Module.decoded = callback || noop;
			};
			
			// Export
			exports.Module = Module;
			exports.Quirc = Module;

			Object.defineProperty(exports, '__esModule', {
				value: true
			});
		})));
