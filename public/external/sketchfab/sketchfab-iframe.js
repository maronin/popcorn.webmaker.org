//Copyright 2012, etc.

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define([], factory);
    } else {
        // Browser globals
        root['sketchfab-iframe'] = factory();
    }
}(this, function () {



/**
 * almond 0.1.2 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice,
        main, req;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {},
            nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part;

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; (part = name[i]); i++) {
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            return true;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    function makeMap(name, relName) {
        var prefix, plugin,
            index = name.indexOf('!');

        if (index !== -1) {
            prefix = normalize(name.slice(0, index), relName);
            name = name.slice(index + 1);
            plugin = callDep(prefix);

            //Normalize according
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            p: plugin
        };
    }

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, ret, map, i;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i++) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = makeRequire(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = defined[name] = {};
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = {
                        id: name,
                        uri: '',
                        exports: defined[name],
                        config: makeConfig(name)
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else if (!defining[depName]) {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                    cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

define("tools/almond", function(){});

(function(p){"function"===typeof bootstrap?bootstrap("promise",p):"object"===typeof exports?p(void 0,exports):"function"===typeof define?define('vendors/q/q.min',p):"undefined"!==typeof ses?ses.ok()&&(ses.makeQ=function(){return p(void 0,{})}):p(void 0,Q={})})(function(p,b){function H(a,c){c.stack&&("object"===typeof a&&null!==a&&a.stack&&-1===a.stack.indexOf(I))&&(a.stack=J(a.stack)+"\n"+I+"\n"+J(c.stack))}function J(a){for(var a=a.split("\n"),c=[],d=0;d<a.length;++d){var e=a[d],b;if(b=/at .+ \((.*):(\d+):\d+\)/.exec(e)){var h=
b[2];b=b[1]===K&&h>=W&&h<=X}else b=!1;!b&&!(-1!==e.indexOf("(module.js:")||-1!==e.indexOf("(node.js:"))&&c.push(e)}return c.join("\n")}function L(){if(Error.captureStackTrace){var a,c,d=Error.prepareStackTrace;Error.prepareStackTrace=function(d,b){a=b[1].getFileName();c=b[1].getLineNumber()};Error().stack;Error.prepareStackTrace=d;K=a;return c}}function M(a,c,d){return function(){"undefined"!==typeof console&&"function"===typeof console.warn&&console.warn(c+" is deprecated, use "+d+" instead.",Error("").stack);
return a.apply(a,arguments)}}function i(){function a(a){c&&(e=q(a),s(c,function(a,c){l(function(){e.promiseDispatch.apply(e,c)})},void 0),d=c=void 0)}var c=[],d=[],e,b=y(i.prototype),h=y(j.prototype);h.promiseDispatch=function(a,b,h){var k=g(arguments);c?(c.push(k),"when"===b&&h[1]&&d.push(h[1])):l(function(){e.promiseDispatch.apply(e,k)})};h.valueOf=function(){return c?h:e.valueOf()};Error.captureStackTrace&&(Error.captureStackTrace(h,i),h.stack=h.stack.substring(h.stack.indexOf("\n")+1));w(h);b.promise=
h;b.resolve=a;b.reject=function(c){a(m(c))};b.notify=function(a){c&&s(d,function(c,d){l(function(){d(a)})},void 0)};return b}function j(a,c,d,b){void 0===c&&(c=function(a){return m(Error("Promise does not support operation: "+a))});var k=y(j.prototype);k.promiseDispatch=function(d,b,e){var f;try{f=a[b]?a[b].apply(k,e):c.call(k,b,e)}catch(i){f=m(i)}d&&d(f)};d&&(k.valueOf=d);b&&(k.exception=b);w(k);return k}function r(a){return t(a)?a.valueOf():a}function t(a){return a&&"function"===typeof a.promiseDispatch}
function z(a){return!t(r(a))}function N(a){a=r(a);return t(a)&&"exception"in a}function m(a){var a=a||Error(),c=j({when:function(c){if(c){var b=Y(A,this);-1!==b&&(B.splice(b,1),A.splice(b,1))}return c?c(a):m(a)}},function(){return m(a)},function(){return this},a);!O&&("undefined"!==typeof window&&!window.Touch&&window.console)&&console.log("Should be empty:",B);O=!0;A.push(c);B.push(a);return c}function q(a){if(t(a))return a;if((a=r(a))&&"function"===typeof a.then){var c=i();a.then(c.resolve,c.reject,
c.notify);return c.promise}return j({when:function(){return a},get:function(c){return a[c]},put:function(c,b){a[c]=b;return a},del:function(c){delete a[c];return a},post:function(c,b){return a[c].apply(a,b)},apply:function(c){return a.apply(void 0,c)},keys:function(){return Z(a)}},void 0,function(){return a})}function f(a,c,d,b){function k(a){try{return c?c(a):a}catch(d){return m(d)}}function h(a){if(d){H(a,j);try{return d(a)}catch(c){return m(c)}}return m(a)}var f=i(),g=!1,j=q(a);l(function(){j.promiseDispatch(function(a){g||
(g=!0,f.resolve(k(a)))},"when",[function(a){g||(g=!0,f.resolve(h(a)))}])});j.promiseDispatch(void 0,"when",[void 0,function(a){f.notify(b?b(a):a)}]);return f.promise}function P(a,c,d){return f(a,function(a){return x(a).then(function(a){return c.apply(void 0,a)},d)},d)}function C(a,c,d){var b=i();l(function(){q(a).promiseDispatch(b.resolve,c,d)});return b.promise}function o(a){return function(c){var d=g(arguments,1);return C(c,a,d)}}function D(a){var c=g(arguments,1);return u(a,c)}function x(a){return f(a,
function(a){var d=a.length;if(0===d)return q(a);var b=i();s(a,function(k,h,g){z(h)?(a[g]=r(h),0===--d&&b.resolve(a)):f(h,function(f){a[g]=f;0===--d&&b.resolve(a)}).fail(b.reject)},void 0);return b.promise})}function R(a,c){return f(a,void 0,c)}function S(a,c){var d=g(arguments,2),b=i();d.push(b.makeNodeResolver());E(a,c,d).fail(b.reject);return b.promise}var W=L(),K,F=function(){},w=Object.freeze||F;"undefined"!==typeof cajaVM&&(w=cajaVM.def);var l;if("undefined"!==typeof process)l=process.nextTick;
else if("function"===typeof setImmediate)l=setImmediate;else if("undefined"!==typeof MessageChannel){var T=new MessageChannel,v={},U=v;T.port1.onmessage=function(){v=v.next;var a=v.task;delete v.task;a()};l=function(a){U=U.next={task:a};T.port2.postMessage(0)}}else l=function(a){setTimeout(a,0)};var n;Function.prototype.bind?(n=Function.prototype.bind,n=n.bind(n.call)):n=function(a){return function(){return a.call.apply(a,arguments)}};var g=n(Array.prototype.slice),s=n(Array.prototype.reduce||function(a,
c){var d=0,b=this.length;if(arguments.length===1){do{if(d in this){c=this[d++];break}if(++d>=b)throw new TypeError;}while(1)}for(;d<b;d++)d in this&&(c=a(c,this[d],d));return c}),Y=n(Array.prototype.indexOf||function(a){for(var c=0;c<this.length;c++)if(this[c]===a)return c;return-1}),V=n(Array.prototype.map||function(a,c){var b=this,e=[];s(b,function(f,h,g){e.push(a.call(c,h,g,b))},void 0);return e}),y=Object.create||function(a){function c(){}c.prototype=a;return new c},Z=Object.keys||function(a){var c=
[],b;for(b in a)c.push(b);return c},$=Object.prototype.toString,G;G="undefined"!==typeof ReturnValue?ReturnValue:function(a){this.value=a};var I="From previous event:";b.nextTick=l;b.defer=i;i.prototype.makeNodeResolver=function(){var a=this;return function(c,b){c?a.reject(c):arguments.length>2?a.resolve(g(arguments,1)):a.resolve(b)}};b.promise=function(a){var c=i();D(a,c.resolve,c.reject,c.notify).fail(c.reject);return c.promise};b.makePromise=j;j.prototype.then=function(a,c,b){return f(this,a,c,
b)};j.prototype.thenResolve=function(a){return f(this,function(){return a})};s("isResolved isFulfilled isRejected dispatch when spread get put del post send invoke keys fapply fcall fbind all allResolved timeout delay catch finally fail fin progress end done nfcall nfapply nfbind ncall napply nbind npost nsend ninvoke nend nodeify".split(" "),function(a,c){j.prototype[c]=function(){return b[c].apply(b,[this].concat(g(arguments)))}},void 0);j.prototype.toSource=function(){return this.toString()};j.prototype.toString=
function(){return"[object Promise]"};w(j.prototype);b.nearer=r;b.isPromise=t;b.isResolved=function(a){return z(a)||N(a)};b.isFulfilled=z;b.isRejected=N;var A=[],B=[],O;b.reject=m;b.resolve=q;b.master=function(a){return j({isDef:function(){}},function(c,b){return C(a,c,b)},function(){return r(a)})};b.when=f;b.spread=P;b.async=function(a){return function(){function c(a,c){var i;try{i=b[a](c)}catch(j){return $(j)==="[object StopIteration]"||j instanceof G?j.value:m(j)}return f(i,e,g)}var b=a.apply(this,
arguments),e=c.bind(c,"send"),g=c.bind(c,"throw");return e()}};b["return"]=function(a){throw new G(a);};b.promised=function(a){return function(){return P([this,x(arguments)],function(c,b){return a.apply(c,b)})}};b.dispatch=C;b.dispatcher=o;b.get=o("get");b.put=o("put");b["delete"]=b.del=o("del");var E=b.post=o("post");b.send=function(a,c){var b=g(arguments,2);return E(a,c,b)};b.invoke=M(b.send,"invoke","send");var u=b.fapply=o("apply");b["try"]=D;b.fcall=D;b.fbind=function(a){var c=g(arguments,1);
return function(){var b=c.concat(g(arguments));return u(a,b)}};b.keys=o("keys");b.all=x;b.allResolved=function(a){return f(a,function(a){return f(x(V(a,function(a){return f(a,F,F)})),function(){return V(a,q)})})};b["catch"]=b.fail=R;b.progress=function(a,c){return f(a,void 0,void 0,c)};b["finally"]=b.fin=function(a,c){return f(a,function(a){return f(c(),function(){return a})},function(a){return f(c(),function(){return m(a)})})};b.done=function(a,c,d,e){c=c||d||e?f(a,c,d,e):a;R(c,function(c){l(function(){H(c,
a);if(b.onerror)b.onerror(c);else throw c;})})};b.timeout=function(a,c){var b=i(),e=setTimeout(function(){b.reject(Error("Timed out after "+c+" ms"))},c);f(a,function(a){clearTimeout(e);b.resolve(a)},function(a){clearTimeout(e);b.reject(a)});return b.promise};b.delay=function(a,c){if(c===void 0){c=a;a=void 0}var b=i();setTimeout(function(){b.resolve(a)},c);return b.promise};b.nfapply=function(a,c){var b=g(c),e=i();b.push(e.makeNodeResolver());u(a,b).fail(e.reject);return e.promise};b.nfcall=function(a){var c=
g(arguments,1),b=i();c.push(b.makeNodeResolver());u(a,c).fail(b.reject);return b.promise};b.nfbind=function(a){var c=g(arguments,1);return function(){var b=c.concat(g(arguments)),e=i();b.push(e.makeNodeResolver());u(a,b).fail(e.reject);return e.promise}};b.npost=function(a,c,b){var b=g(b),e=i();b.push(e.makeNodeResolver());E(a,c,b).fail(e.reject);return e.promise};b.nsend=S;b.ninvoke=M(S,"ninvoke","nsend");b.nodeify=function(a,b){if(b)a.then(function(a){l(function(){b(null,a)})},function(a){l(function(){b(a)})});
else return a};var X=L()});

define('api/sketchfab-iframe',[ "vendors/q/q.min"], function( Q ) {

    /**
       // using start
       var iframe = $('#iframe')[0];
       var sketchfab = SketchFab(iframe);
       SketchFab.Q.when(myIframe.load(urlid), function(data) {
         console.log("success");
         console.log(data);
         sketchfab.start();
       }).fail(function(error) {
         console.log(error);
       });
     */

    var API = function(iframe) {
        this._iframe = iframe;
        iframe.src = "about:blank"; // reset src content

        this._uid = undefined;
        if (window.location.href.search("sketchfab") === -1) {
            this._domain = window.location.protocol + "//sketchfab.com";
        } else {
            this._domain = "///" + window.location.hostname;
        }
        this._callback = undefined;
        this._events = {};

        var self = this;

        var messageFunction = function(event) {
            //console.debug(event);
            if (event.data === undefined || event.data.source === undefined) {
                return;
            }
            self.message(event.data);
        };

        window.addEventListener('message', messageFunction, false);
        this._messageFunction = messageFunction;
    };


    // to not expose it in api
    var handleEvent = function(data, clear) {
        if (data.error !== undefined) {

            // exception for lookat if we override animation
            // it's handled on the api side so we dont want to handle this error
            if (data.status === "lookat" && data.error === "camera animation not finished") {
                return;
            }

            this._events[data.status].reject(data.error);
            if (clear) {
                this._events[data.status] = undefined;
            }
        } else {
            // XXXsecretrobotron: Added an extra `if` layer to protect against unexpected empty `_events` properties.
            if (this._events[data.status]) {
                if (this._events[data.status].resolve !== undefined) {
                    this._events[data.status].resolve(data);
                    if (clear) {
                        this._events[data.status] = undefined;
                    }
                }
            } else {
                console.warn('Unexpected event not handled: "' + data.status + '"');
            }
        }
    };

    API.prototype = {
        setMessageCallback: function(cb) {
            this._callback = cb;
        },

        message: function(data) {
            if (data.source !== this._uid) {
                return;
            }
            if (data.status !== undefined) {

                if (data.status === "load") {
                    handleEvent.call(this, data, false);
                } else {
                    handleEvent.call(this, data, true);
                }

            }

            if (this._callback) {
                this._callback.call(this, data);
            }
        },
        load: function(uid, options) {
            if (this._events.load !== undefined) {
                return this._events.load.promise;
            }
            var self = this;

            var _createURL = function(uid) {
                var urloptions = "?preload=1";
                if (options) {
                    Object.keys(options).forEach(function(key, index, array) {
                        var value;
                        if (options[key] !== undefined) {
                            value = options[key].toString();
                        }
                        urloptions += "&"+key + "=" + value;
                    });
                }

                return self._domain + "/embed/"+uid + urloptions;
            };

            this._uid = uid;
            this._events.load = Q.defer();
            var url = _createURL(uid);
            this._iframe.src = url;
            return this._events.load.promise;
        },
        start: function() {
            if (this._events.start !== undefined) {
                return this._events.start.promise;
            }
            this._events.start = Q.defer();
            this._iframe.contentWindow.postMessage({ command: "start" }, '*');
            return this._events.start.promise;
        },

        // return a promise that will be resolved at the end of animation
        lookat: function(eyeVector, targetVector, dur) {
            var name = "lookat";

            // already an animation running reject the
            // signal, because it's override by a new animation
            if (this._events[name] !== undefined &&
                !this._events[name].promise.isResolved()) {
                this._events[name].reject("new animation ran");
            }
            this._events[name] = Q.defer();
            this._iframe.contentWindow.postMessage({ command: name,
                                                     eye: eyeVector,
                                                     target: targetVector,
                                                     duration: dur
                                                   }, '*');
            return this._events[name].promise;
        },

        stop: function(cmd) {
            if (this._events.stop !== undefined) {
                return this._events.stop.promise;
            }
            this._events.stop = Q.defer();
            this._iframe.contentWindow.postMessage({ command: "stop" }, '*');
            return this._events.stop.promise;
        },
        finish: function() {
            window.removeEventListener('message', this._messageFunction);
        }
    };
    API.Q = Q;

    return API;
});

/*global define */

/**
 * The main module that defines the public interface for principium,
 * a made-up library to demonstrate how to construct a source from components.
 */
define('sketchfab-iframe',['require','api/sketchfab-iframe'],function (require) {
    

    var SketchfabAPI = require('api/sketchfab-iframe');
    var Q = SketchfabAPI.Q;

    //Return the module value.
    return {
        version: '0.0.1',
        Sketchfab: SketchfabAPI,
        Q: Q
    };
});
    //Register in the values from the outer closure for common dependencies
    //as local almond modules
//    define('Q', function () {
//        return Q;
//    });

    //Use almond's special top-level, synchronous require to trigger factory
    //functions, get the final module value, and export it as the public
    //value.
    return require('sketchfab-iframe');
}));