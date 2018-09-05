(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.yoyowWS = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global){
"use strict";

exports.__esModule = true;

var _ChainWebSocket = require("./ChainWebSocket");

var _ChainWebSocket2 = _interopRequireDefault(_ChainWebSocket);

var _GrapheneApi = require("./GrapheneApi");

var _GrapheneApi2 = _interopRequireDefault(_GrapheneApi);

var _ChainConfig = require("./ChainConfig");

var _ChainConfig2 = _interopRequireDefault(_ChainConfig);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } // var { List } = require("immutable");


var inst;

if (global && global["__WS_DEBUG__"] == undefined) {
    global.__WS_DEBUG__ = JSON.parse(process.env.npm_package_config_wsdebug || false);
}
if (typeof window != "undefined" && window["__WS_DEBUG__"] == undefined) {
    window.__WS_DEBUG__ = JSON.parse(process.env.npm_package_config_wsdebug || false);
}

/**
 Configure: configure as follows `Apis.instance("ws://localhost:8090").init_promise`.  This returns a promise, once resolved the connection is ready.

 Import: import { Apis } from "@graphene/chain"

 Short-hand: Apis.db("method", "parm1", 2, 3, ...).  Returns a promise with results.

 Additional usage: Apis.instance().db_api().exec("method", ["method", "parm1", 2, 3, ...]).  Returns a promise with results.
 */

exports.default = {

    setRpcConnectionStatusCallback: function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
        if (inst) inst.setRpcConnectionStatusCallback(callback);
    },

    /**
     @arg {string} cs is only provided in the first call
     @return {Apis} singleton .. Check Apis.instance().init_promise to know when the connection is established
     */
    reset: function reset() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];

        /*
         if ( inst ) {
         inst.close();
         inst = null;
         }
         inst = new ApisInstance();
         inst.setRpcConnectionStatusCallback(this.statusCb);
          if (inst && connect) {
         inst.connect(cs);
         }
         */
        if (inst) {
            inst.reset(cs);
        } else {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(this.statusCb);
            if (inst && connect) {
                inst.connect(cs);
            }
        }

        return inst;
    },
    instance: function instance() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];

        if (!inst) {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(this.statusCb);
        }

        if (inst && connect) {
            inst.connect(cs);
        }

        return inst;
    },
    chainId: function chainId() {
        return Apis.instance().chain_id;
    },

    close: function close() {
        if (inst) {
            inst.close();
            inst = null;
        }
    }
    // db: (method, ...args) => Apis.instance().db_api().exec(method, toStrings(args)),
    // network: (method, ...args) => Apis.instance().network_api().exec(method, toStrings(args)),
    // history: (method, ...args) => Apis.instance().history_api().exec(method, toStrings(args)),
    // crypto: (method, ...args) => Apis.instance().crypto_api().exec(method, toStrings(args))
};

var ApisInstance = function () {
    function ApisInstance() {
        _classCallCheck(this, ApisInstance);

        this.reseting = false;
        this.resetInterval = null;
    }

    /**
     * 连接api
     * @param cs api的url地址
     */


    ApisInstance.prototype.connect = function connect(cs) {
        var _this = this;

        var rpc_user = "",
            rpc_password = "";
        if (typeof window !== "undefined" && window.location && window.location.protocol === "https:" && cs.indexOf("wss://") < 0) {
            throw new Error("Secure domains require wss connection");
        }

        this.ws_rpc = new _ChainWebSocket2.default(cs, this.statusCb);
        //console.log("New ChainWebSocket");
        this.init_promise = this.ws_rpc.login(rpc_user, rpc_password).then(function () {
            if (_this.resetInterval != null) clearInterval(_this.resetInterval);
            _this.resetInterval = null;
            _this.reseting = false;
            console.log("Login done");
            _this._db = new _GrapheneApi2.default(_this.ws_rpc, "database");
            _this._net = new _GrapheneApi2.default(_this.ws_rpc, "network_broadcast");
            _this._hist = new _GrapheneApi2.default(_this.ws_rpc, "history");
            _this._crypt = new _GrapheneApi2.default(_this.ws_rpc, "crypto");
            var db_promise = _this._db.init().then(function () {
                //https://github.com/cryptonomex/graphene/wiki/chain-locked-tx
                return _this._db.exec("get_chain_id", []).then(function (_chain_id) {
                    _this.chain_id = _chain_id;

                    return _ChainConfig2.default.setChainId(_chain_id);
                });
            });
            return Promise.all([db_promise, _this._net.init(), _this._hist.init(), _this._crypt.init().catch(function (e) {
                return console.error("ApiInstance\tCrypto API Error", e);
            })]);
        }).catch(function (err) {
            if (__WS_DEBUG__) console.log("ApiInstance\tWebSocket connect Error", err);
            return Promise.reject({ message: "ApiInstance\tWebSocket connect Error", code: err.code });
        });
    };

    ApisInstance.prototype.close = function close() {
        if (this.ws_rpc) this.ws_rpc.close();
        this.ws_rpc = null;
    };

    ApisInstance.prototype.reset = function reset(cs) {
        if (!this.reseting) {
            this.reseting = true;
            var __this = this;
            this.resetInterval = setInterval(function () {
                if (__this.statusCb) __this.statusCb("reconnect");
                __this.close();
                __this.connect(cs);
            }, 10000);
        }
    };

    ApisInstance.prototype.db_api = function db_api() {
        return this._db;
    };

    ApisInstance.prototype.network_api = function network_api() {
        return this._net;
    };

    ApisInstance.prototype.history_api = function history_api() {
        return this._hist;
    };

    ApisInstance.prototype.crypto_api = function crypto_api() {
        return this._crypt;
    };

    ApisInstance.prototype.setRpcConnectionStatusCallback = function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
    };

    return ApisInstance;
}();

module.exports = exports["default"];
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./ChainConfig":2,"./ChainWebSocket":3,"./GrapheneApi":4,"_process":8}],2:[function(require,module,exports){
(function (process){
"use strict";

exports.__esModule = true;
var _this = void 0;

var ecc_config = {
    address_prefix: process.env.npm_config__graphene_ecc_default_address_prefix || "YYW"
};

_this = {
    core_asset: "YOYO",
    address_prefix: "YYW",
    expire_in_secs: 15,
    expire_in_secs_proposal: 24 * 60 * 60,
    review_in_secs_committee: 24 * 60 * 60,
    networks: {
        YOYOW: {
            core_asset: "YOYO",
            address_prefix: "YYW",
            chain_id: "ae4f234c75199f67e526c9478cf499dd6e94c2b66830ee5c58d0868a3179baf6"
        },
        Test: {
            core_asset: "TEST",
            address_prefix: "YYW",
            chain_id: "3505e367fe6cde243f2a1c39bd8e58557e23271dd6cbf4b29a8dc8c44c9af8fe"
        }
    },

    /** Set a few properties for known chain IDs. */
    setChainId: function setChainId(chain_id) {

        var i = void 0,
            len = void 0,
            network = void 0,
            network_name = void 0,
            ref = void 0;
        ref = Object.keys(_this.networks);

        for (i = 0, len = ref.length; i < len; i++) {

            network_name = ref[i];
            network = _this.networks[network_name];

            if (network.chain_id === chain_id) {

                _this.network_name = network_name;

                if (network.address_prefix) {
                    _this.address_prefix = network.address_prefix;
                    ecc_config.address_prefix = network.address_prefix;
                }
                if (network.core_asset) {
                    _this.core_asset = network.core_asset;
                }
                console.log("chain_id:", chain_id);
                console.log("network_name:", network_name);
                return {
                    network_name: network_name,
                    network: network
                };
            }
        }

        if (!_this.network_name) {
            console.log("Unknown chain id (this may be a testnet)", chain_id);
        }
    },

    reset: function reset() {
        _this.core_asset = "YOYO";
        _this.address_prefix = "YYW";
        ecc_config.address_prefix = "YYW";
        _this.expire_in_secs = 15;
        _this.expire_in_secs_proposal = 24 * 60 * 60;

        console.log("Chain config reset");
    },

    setPrefix: function setPrefix() {
        var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "YYW";

        _this.address_prefix = prefix;
        ecc_config.address_prefix = prefix;
    }
};

exports.default = _this;
module.exports = exports["default"];
}).call(this,require('_process'))

},{"_process":8}],3:[function(require,module,exports){
(function (process){
"use strict";

exports.__esModule = true;

var _SharedWebSocket = require("./SharedWebSocket");

var _SharedWebSocket2 = _interopRequireDefault(_SharedWebSocket);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WebSocketClient = void 0;

var ChainWebSocket = function () {
    function ChainWebSocket(ws_server, statusCb) {
        var _this = this;

        _classCallCheck(this, ChainWebSocket);

        if (typeof WebSocket === "undefined" && !process.env.browser) {
            WebSocketClient = require("ws");
        } else if (typeof WebSocket !== "undefined" && typeof document !== "undefined") {
            WebSocketClient = require("ReconnectingWebSocket");
        } else {
            WebSocketClient = WebSocket;
        }

        this.statusCb = statusCb;

        try {
            if (typeof window !== "undefined" && !!window.SharedWorker) {
                this.ws = new _SharedWebSocket2.default(ws_server, 5000);
                if (__WS_DEBUG__) console.log('-------SharedWebSocket---------', this.ws);
            } else {
                this.ws = new WebSocketClient(ws_server);
                if (__WS_DEBUG__) console.log('-------WebSocketClient---------', this.ws);
                var __this = this;
                if (this.ws["ping"]) {
                    this.checkSocket = setInterval(function () {
                        __this.ws.ping(0);
                    }, 2000);
                } else {
                    this.ws.timeoutInterval = 5000;
                    this.checkSocket = setInterval(function () {
                        if (__this.ws.readyState == 3) {
                            __this.__clearCheckSocket();
                            if (__this.statusCb) __this.statusCb("closed");
                        }
                    }, 2000);
                }
            }
        } catch (error) {
            console.error("invalid websocket URL:", error);
            if (this.current_reject) {
                this.current_reject(error);
            }
        }

        this.current_reject = null;
        this.connect_promise = new Promise(function (resolve, reject) {
            _this.current_reject = reject;
            _this.ws.on("open", function () {
                if (__WS_DEBUG__) console.log("onopen...");
                if (_this.statusCb) _this.statusCb("open");
                resolve();
            });
            _this.ws.on("error", function (error) {
                if (__WS_DEBUG__) console.log("error...");
                _this.__clearCheckSocket();
                if (_this.statusCb) _this.statusCb("error");
                if (_this.current_reject) {
                    _this.current_reject(error);
                }
            });
            _this.ws.on("message", function (message) {
                return _this.listener(JSON.parse(message));
            });
            _this.ws.on("close", function (event) {
                if (__WS_DEBUG__) console.log("onclose...", event);
                _this.__clearCheckSocket();
                if (_this.statusCb) _this.statusCb("closed");
                if (_this.current_reject) {
                    _this.current_reject(event);
                }
            });
        });
        this.cbId = 0;
        this.cbs = {};
        this.subs = {};
        this.unsub = {};
    }

    ChainWebSocket.prototype.__clearCheckSocket = function __clearCheckSocket() {
        if (this.checkSocket != null) {
            clearInterval(this.checkSocket);
            this.checkSocket = null;
        }
    };

    ChainWebSocket.prototype.call = function call(params) {
        var _this2 = this;

        var method = params[1];
        if (__WS_DEBUG__) console.log("[ChainWebSocket] >---- call ----->  \"id\":" + (this.cbId + 1), JSON.stringify(params));

        this.cbId += 1;

        if (method === "set_subscribe_callback" || method === "subscribe_to_market" || method === "broadcast_transaction_with_callback" || method === "set_pending_transaction_callback") {
            // Store callback in subs map
            this.subs[this.cbId] = {
                callback: params[2][0]
            };

            // Replace callback with the callback id
            params[2][0] = this.cbId;
        }

        if (method === "unsubscribe_from_market" || method === "unsubscribe_from_accounts") {
            if (typeof params[2][0] !== "function") {
                throw new Error("First parameter of unsub must be the original callback");
            }

            var unSubCb = params[2].splice(0, 1)[0];

            // Find the corresponding subscription
            for (var id in this.subs) {
                if (this.subs[id].callback === unSubCb) {
                    this.unsub[this.cbId] = id;
                    break;
                }
            }
        }

        var request = {
            method: "call",
            params: params
        };
        request.id = this.cbId;
        //console.log("!!! ChainWebSocket call");
        return new Promise(function (resolve, reject) {
            _this2.cbs[_this2.cbId] = {
                time: new Date(),
                resolve: resolve,
                reject: reject
            };
            /*this.ws.onerror = (error) => {
                console.log("!!! ChainWebSocket Error ", error);
                reject(error);
            };*/
            _this2.ws.send(JSON.stringify(request));
        });
    };

    ChainWebSocket.prototype.listener = function listener(response) {
        if (__WS_DEBUG__) console.log("[ChainWebSocket] <---- reply ----<", JSON.stringify(response));

        var sub = false,
            callback = null;

        if (response.method === "notice") {
            sub = true;
            response.id = response.params[0];
        }

        if (!sub) {
            callback = this.cbs[response.id];
        } else {
            callback = this.subs[response.id].callback;
        }

        if (callback && !sub) {
            if (response.error) {
                callback.reject(response.error);
            } else {
                callback.resolve(response.result);
            }
            delete this.cbs[response.id];

            if (this.unsub[response.id]) {
                delete this.subs[this.unsub[response.id]];
                delete this.unsub[response.id];
            }
        } else if (callback && sub) {
            callback(response.params[1]);
        } else {
            if (__WS_DEBUG__) console.log("Warning: unknown websocket response: ", response);
        }
    };

    ChainWebSocket.prototype.login = function login(user, password) {
        var _this3 = this;

        return this.connect_promise.then(function () {
            return _this3.call([1, "login", [user, password]]);
        });
    };

    ChainWebSocket.prototype.close = function close() {
        this.ws.close();
    };

    ChainWebSocket.prototype.reset = function reset() {
        if (this.ws.reset) this.ws.reset();
    };

    return ChainWebSocket;
}();

exports.default = ChainWebSocket;
module.exports = exports["default"];
}).call(this,require('_process'))

},{"./SharedWebSocket":5,"ReconnectingWebSocket":6,"_process":8,"ws":7}],4:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GrapheneApi = function () {
    function GrapheneApi(ws_rpc, api_name) {
        _classCallCheck(this, GrapheneApi);

        this.ws_rpc = ws_rpc;
        this.api_name = api_name;
    }

    GrapheneApi.prototype.init = function init() {
        var self = this;
        return this.ws_rpc.call([1, this.api_name, []]).then(function (response) {
            self.api_id = response;
            return self;
        });
    };

    GrapheneApi.prototype.exec = function exec(method, params) {
        return this.ws_rpc.call([this.api_id, method, params]).catch(function (error) {
            console.log("!!! GrapheneApi error: ", method, params, error, JSON.stringify(error));
            //throw error;
        });
    };

    return GrapheneApi;
}();

exports.default = GrapheneApi;
module.exports = exports["default"];
},{}],5:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Created by necklace on 17-5-3.
 */

var webSocketWorker = 'var _typeof=typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"?function(a){return typeof a}:function(a){return a&&typeof Symbol==="function"&&a.constructor===Symbol&&a!==Symbol.prototype?"symbol":typeof a};var ports=[];var socket=null;var server="";var ws_timeout=5000;var pingSocket=null;var close_normal=false;function broadcast(b){for(var a=0;a<ports.length;a++){ports[a].postMessage(b)}}var wconsole={error:function error(b,a){wconsole.post("error",b,a)},log:function log(b,a){wconsole.post("log",b,a)},msg:function msg(a){broadcast(a)},post:function post(a,c,b){broadcast({tag:a,title:c,msg:b})},postTarget:function postTarget(a,b){a.postMessage(b)}};function initWS(a){var b=arguments.length>1&&arguments[1]!==undefined?arguments[1]:5000;close_normal=false;if(socket===null){socket=new WebSocket(a);socket.timeoutInterval=b;socket.onopen=function(){broadcast({event:"onopen"})};socket.onerror=function(d){broadcast({event:"onerror",data:d});clearInterval(pingSocket)};socket.onmessage=function(d){broadcast({event:"onmessage",data:d.data})};socket.onclose=function(d){broadcast({event:"onclose",data:d});clearInterval(pingSocket)};pingSocket=setInterval(function(){if(socket.readyState==3){broadcast({event:"onclose",data:{code:close_normal?1000:1005}});clearInterval(pingSocket)}},1000)}}function procMsg(c,a){if((typeof c==="undefined"?"undefined":_typeof(c))==="object"){if(!!c.method){switch(c.method){case"send":if(!!socket){socket.send(c.pars[0])}break;case"close":close_normal=true;ports.clean();if(!!socket){socket.close()}break;case"init":var b=c.pars[0];ws_timeout=c.pars[1];if(b!==server){server=b;initWS(server,ws_timeout)}break;case"reset":close_normal=true;socket.close();socket=null;initWS(server,ws_timeout);break;case"ping":wconsole.postTarget(a,{tag:"log",title:"ping",msg:socket.readyState});break;default:wconsole.postTarget(a,{tag:"error",title:"worker",msg:"Unsupported method"});break}}}}onconnect=function onconnect(b){var a=b.ports[0];ports.push(a);a.addEventListener("message",function(c){procMsg(c.data,a)});a.start();a.postMessage({event:"onconnect",data:ports.length})};';

var SharedWebSocket = function () {
    function SharedWebSocket(url, timeout) {
        var _this = this;

        _classCallCheck(this, SharedWebSocket);

        this.ws_url = url;
        this.timeout = timeout;
        this.onopen = null;
        this.onerror = null;
        this.onmessage = null;
        this.onclose = null;
        this.WebSocketWorker = null;
        var worker_blob = new Blob([webSocketWorker]);
        this.WebSocketWorker = new SharedWorker(window.URL.createObjectURL(worker_blob));
        //this.WebSocketWorker = new SharedWorker("testWorker.js");

        this.WebSocketWorker.port.onmessage = function (obj) {
            //console.log('=================', obj);
            _this._procOnMessage(obj.data);
        };
        this.WebSocketWorker.addEventListener('error', function (e) {
            this._procError(e.message);
        });
        /*
        this.WebSocketWorker.onerror = (e) => {
            this._procError(e.message);
        };
        */
        //this.WebSocketWorker.port.start()
    }

    SharedWebSocket.prototype._procOnMessage = function _procOnMessage(obj) {
        //console.log('0=0=0=0=0=',obj)
        if (!!obj.tag) {
            switch (obj.tag) {
                case "error":
                    console.error(obj.title, obj.msg);
                    break;
                case "log":
                    console.log(obj.title, obj.msg);
                    break;
            }
        } else if (!!obj.event) {
            switch (obj.event) {
                case "onopen":
                    if (this.onopen) this.onopen();
                    break;
                case "onerror":
                    if (this.onerror) this.onerror(obj.data);
                    break;
                case "onmessage":
                    if (this.onmessage) this.onmessage(obj.data);
                    break;
                case "onclose":
                    if (this.onclose) this.onclose(obj.data);
                    break;
                case "onconnect":
                    //与sharedworker连接成功
                    //console.log("port数量：", obj.data);
                    if (obj.data == 1) {
                        this.WebSocketWorker.port.postMessage({
                            method: "init",
                            pars: [this.ws_url, this.timeout]
                        });
                    }
                    break;
            }
        }
    };

    SharedWebSocket.prototype._procError = function _procError(e) {
        console.error(e);
    };

    SharedWebSocket.prototype.send = function send(str) {
        this.WebSocketWorker.port.postMessage({ method: "send", pars: [str] });
    };

    SharedWebSocket.prototype.close = function close() {
        this.WebSocketWorker.port.postMessage({ method: "close" });
    };

    SharedWebSocket.prototype.reset = function reset() {
        this.WebSocketWorker.port.postMessage({ method: "reset" });
    };

    SharedWebSocket.prototype.on = function on(event, callback) {
        switch (event) {
            case "open":
                this.onopen = callback;
                break;
            case "error":
                this.onerror = callback;
                break;
            case "message":
                this.onmessage = callback;
                break;
            case "close":
                this.onclose = callback;
                break;
        }
    };

    return SharedWebSocket;
}();

exports.default = SharedWebSocket;
module.exports = exports['default'];
},{}],6:[function(require,module,exports){
// MIT License:
//
// Copyright (c) 2010-2012, Joe Walnes
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/**
 * This behaves like a WebSocket in every way, except if it fails to connect,
 * or it gets disconnected, it will repeatedly poll until it successfully connects
 * again.
 *
 * It is API compatible, so when you have:
 *   ws = new WebSocket('ws://....');
 * you can replace with:
 *   ws = new ReconnectingWebSocket('ws://....');
 *
 * The event stream will typically look like:
 *  onconnecting
 *  onopen
 *  onmessage
 *  onmessage
 *  onclose // lost connection
 *  onconnecting
 *  onopen  // sometime later...
 *  onmessage
 *  onmessage
 *  etc...
 *
 * It is API compatible with the standard WebSocket API, apart from the following members:
 *
 * - `bufferedAmount`
 * - `extensions`
 * - `binaryType`
 *
 * Latest version: https://github.com/joewalnes/reconnecting-websocket/
 * - Joe Walnes
 *
 * Syntax
 * ======
 * var socket = new ReconnectingWebSocket(url, protocols, options);
 *
 * Parameters
 * ==========
 * url - The url you are connecting to.
 * protocols - Optional string or array of protocols.
 * options - See below
 *
 * Options
 * =======
 * Options can either be passed upon instantiation or set after instantiation:
 *
 * var socket = new ReconnectingWebSocket(url, null, { debug: true, reconnectInterval: 4000 });
 *
 * or
 *
 * var socket = new ReconnectingWebSocket(url);
 * socket.debug = true;
 * socket.reconnectInterval = 4000;
 *
 * debug
 * - Whether this instance should log debug messages. Accepts true or false. Default: false.
 *
 * automaticOpen
 * - Whether or not the websocket should attempt to connect immediately upon instantiation. The socket can be manually opened or closed at any time using ws.open() and ws.close().
 *
 * reconnectInterval
 * - The number of milliseconds to delay before attempting to reconnect. Accepts integer. Default: 1000.
 *
 * maxReconnectInterval
 * - The maximum number of milliseconds to delay a reconnection attempt. Accepts integer. Default: 30000.
 *
 * reconnectDecay
 * - The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. Accepts integer or float. Default: 1.5.
 *
 * timeoutInterval
 * - The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. Accepts integer. Default: 2000.
 *
 */
(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module !== 'undefined' && module.exports){
        module.exports = factory();
    } else {
        global.ReconnectingWebSocket = factory();
    }
})(this, function () {

    if (typeof window === "undefined" || !('WebSocket' in window)) {
        return;
    }

    function ReconnectingWebSocket(url, protocols, options) {

        // Default settings
        var settings = {

            /** Whether this instance should log debug messages. */
            debug: false,

            /** Whether or not the websocket should attempt to connect immediately upon instantiation. */
            automaticOpen: true,

            /** The number of milliseconds to delay before attempting to reconnect. */
            reconnectInterval: 1000,
            /** The maximum number of milliseconds to delay a reconnection attempt. */
            maxReconnectInterval: 30000,
            /** The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. */
            reconnectDecay: 1.5,

            /** The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. */
            timeoutInterval: 2000,

            /** The maximum number of reconnection attempts to make. Unlimited if null. */
            maxReconnectAttempts: null,

            /** The binary type, possible values 'blob' or 'arraybuffer', default 'blob'. */
            binaryType: 'blob'
        }
        if (!options) { options = {}; }

        // Overwrite and define settings with options if they exist.
        for (var key in settings) {
            if (typeof options[key] !== 'undefined') {
                this[key] = options[key];
            } else {
                this[key] = settings[key];
            }
        }

        // These should be treated as read-only properties

        /** The URL as resolved by the constructor. This is always an absolute URL. Read only. */
        this.url = url;

        /** The number of attempted reconnects since starting, or the last successful connection. Read only. */
        this.reconnectAttempts = 0;

        /**
         * The current state of the connection.
         * Can be one of: WebSocket.CONNECTING, WebSocket.OPEN, WebSocket.CLOSING, WebSocket.CLOSED
         * Read only.
         */
        this.readyState = WebSocket.CONNECTING;

        /**
         * A string indicating the name of the sub-protocol the server selected; this will be one of
         * the strings specified in the protocols parameter when creating the WebSocket object.
         * Read only.
         */
        this.protocol = null;

        // Private state variables

        var self = this;
        var ws;
        var forcedClose = false;
        var timedOut = false;
        var t = null;
        var eventTarget = document.createElement('div');

        // Wire up "on*" properties as event handlers

        eventTarget.addEventListener('open',       function(event) { self.onopen(event); });
        eventTarget.addEventListener('close',      function(event) { self.onclose(event); });
        eventTarget.addEventListener('connecting', function(event) { self.onconnecting(event); });
        eventTarget.addEventListener('message',    function(event) { self.onmessage(event); });
        eventTarget.addEventListener('error',      function(event) { self.onerror(event); });

        // Expose the API required by EventTarget

        this.addEventListener = eventTarget.addEventListener.bind(eventTarget);
        this.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
        this.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);

        /**
         * This function generates an event that is compatible with standard
         * compliant browsers and IE9 - IE11
         *
         * This will prevent the error:
         * Object doesn't support this action
         *
         * http://stackoverflow.com/questions/19345392/why-arent-my-parameters-getting-passed-through-to-a-dispatched-event/19345563#19345563
         * @param s String The name that the event should use
         * @param args Object an optional object that the event will use
         */
        function generateEvent(s, args) {
        	var evt = document.createEvent("CustomEvent");
        	evt.initCustomEvent(s, false, false, args);
        	return evt;
        };

        this.open = function (reconnectAttempt) {
            ws = new WebSocket(self.url, protocols || []);
            ws.binaryType = this.binaryType;

            if (reconnectAttempt) {
                if (this.maxReconnectAttempts && this.reconnectAttempts > this.maxReconnectAttempts) {
                    return;
                }
            } else {
                eventTarget.dispatchEvent(generateEvent('connecting'));
                this.reconnectAttempts = 0;
            }

            if (self.debug || ReconnectingWebSocket.debugAll) {
                console.debug('ReconnectingWebSocket', 'attempt-connect', self.url);
            }

            var localWs = ws;
            var timeout = setTimeout(function() {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'connection-timeout', self.url);
                }
                timedOut = true;
                localWs.close();
                timedOut = false;
            }, self.timeoutInterval);

            ws.onopen = function(event) {
                clearTimeout(timeout);
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onopen', self.url);
                }
                self.protocol = ws.protocol;
                self.readyState = WebSocket.OPEN;
                self.reconnectAttempts = 0;
                var e = generateEvent('open');
                e.isReconnect = reconnectAttempt;
                reconnectAttempt = false;
                eventTarget.dispatchEvent(e);
            };

            ws.onclose = function(event) {
                clearTimeout(timeout);
                ws = null;
                if (forcedClose) {
                    self.readyState = WebSocket.CLOSED;
                    eventTarget.dispatchEvent(generateEvent('close'));
                } else {
                    self.readyState = WebSocket.CONNECTING;
                    var e = generateEvent('connecting');
                    e.code = event.code;
                    e.reason = event.reason;
                    e.wasClean = event.wasClean;
                    eventTarget.dispatchEvent(e);
                    if (!reconnectAttempt && !timedOut) {
                        if (self.debug || ReconnectingWebSocket.debugAll) {
                            console.debug('ReconnectingWebSocket', 'onclose', self.url);
                        }
                        eventTarget.dispatchEvent(generateEvent('close'));
                    }

                    var timeout = self.reconnectInterval * Math.pow(self.reconnectDecay, self.reconnectAttempts);
                    t = setTimeout(function() {
                        self.reconnectAttempts++;
                        self.open(true);
                    }, timeout > self.maxReconnectInterval ? self.maxReconnectInterval : timeout);
                }
            };
            ws.onmessage = function(event) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onmessage', self.url, event.data);
                }
                var e = generateEvent('message');
                e.data = event.data;
                eventTarget.dispatchEvent(e);
            };
            ws.onerror = function(event) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onerror', self.url, event);
                }
                eventTarget.dispatchEvent(generateEvent('error'));
            };
        }

        // Whether or not to create a websocket upon instantiation
        if (this.automaticOpen == true) {
            this.open(false);
        }

        /**
         * Transmits data to the server over the WebSocket connection.
         *
         * @param data a text string, ArrayBuffer or Blob to send to the server.
         */
        this.send = function(data) {
            if (ws) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'send', self.url, data);
                }
                return ws.send(data);
            } else {
                throw 'INVALID_STATE_ERR : Pausing to reconnect websocket';
            }
        };

        /**
         * Closes the WebSocket connection or connection attempt, if any.
         * If the connection is already CLOSED, this method does nothing.
         */
        this.close = function(code, reason) {
            // Default CLOSE_NORMAL code
            if (typeof code == 'undefined') {
                code = 1000;
            }
            forcedClose = true;
            if (ws) {
                ws.close(code, reason);
            }
            if (t) {
                clearTimeout(t);
                t = null;
            }
        };

        /**
         * Additional public API method to refresh the connection if still open (close, re-open).
         * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
         */
        this.refresh = function() {
            if (ws) {
                ws.close();
            }
        };
    }

    /**
     * An event listener to be called when the WebSocket connection's readyState changes to OPEN;
     * this indicates that the connection is ready to send and receive data.
     */
    ReconnectingWebSocket.prototype.onopen = function(event) {};
    /** An event listener to be called when the WebSocket connection's readyState changes to CLOSED. */
    ReconnectingWebSocket.prototype.onclose = function(event) {};
    /** An event listener to be called when a connection begins being attempted. */
    ReconnectingWebSocket.prototype.onconnecting = function(event) {};
    /** An event listener to be called when a message is received from the server. */
    ReconnectingWebSocket.prototype.onmessage = function(event) {};
    /** An event listener to be called when an error occurs. */
    ReconnectingWebSocket.prototype.onerror = function(event) {};

    /**
     * Whether all instances of ReconnectingWebSocket should log debug messages.
     * Setting this to true is the equivalent of setting all instances of ReconnectingWebSocket.debug to true.
     */
    ReconnectingWebSocket.debugAll = false;

    ReconnectingWebSocket.CONNECTING = WebSocket.CONNECTING;
    ReconnectingWebSocket.OPEN = WebSocket.OPEN;
    ReconnectingWebSocket.CLOSING = WebSocket.CLOSING;
    ReconnectingWebSocket.CLOSED = WebSocket.CLOSED;

    return ReconnectingWebSocket;
});

},{}],7:[function(require,module,exports){

},{}],8:[function(require,module,exports){
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
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjanMvc3JjL0FwaUluc3RhbmNlcy5qcyIsImNqcy9zcmMvQ2hhaW5Db25maWcuanMiLCJjanMvc3JjL0NoYWluV2ViU29ja2V0LmpzIiwiY2pzL3NyYy9HcmFwaGVuZUFwaS5qcyIsImNqcy9zcmMvU2hhcmVkV2ViU29ja2V0LmpzIiwibm9kZV9tb2R1bGVzL1JlY29ubmVjdGluZ1dlYlNvY2tldC9yZWNvbm5lY3Rpbmctd2Vic29ja2V0LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVzb2x2ZS9lbXB0eS5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNsTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xYQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgX0NoYWluV2ViU29ja2V0ID0gcmVxdWlyZShcIi4vQ2hhaW5XZWJTb2NrZXRcIik7XG5cbnZhciBfQ2hhaW5XZWJTb2NrZXQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ2hhaW5XZWJTb2NrZXQpO1xuXG52YXIgX0dyYXBoZW5lQXBpID0gcmVxdWlyZShcIi4vR3JhcGhlbmVBcGlcIik7XG5cbnZhciBfR3JhcGhlbmVBcGkyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfR3JhcGhlbmVBcGkpO1xuXG52YXIgX0NoYWluQ29uZmlnID0gcmVxdWlyZShcIi4vQ2hhaW5Db25maWdcIik7XG5cbnZhciBfQ2hhaW5Db25maWcyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ2hhaW5Db25maWcpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfSAvLyB2YXIgeyBMaXN0IH0gPSByZXF1aXJlKFwiaW1tdXRhYmxlXCIpO1xuXG5cbnZhciBpbnN0O1xuXG5pZiAoZ2xvYmFsICYmIGdsb2JhbFtcIl9fV1NfREVCVUdfX1wiXSA9PSB1bmRlZmluZWQpIHtcbiAgICBnbG9iYWwuX19XU19ERUJVR19fID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5ucG1fcGFja2FnZV9jb25maWdfd3NkZWJ1ZyB8fCBmYWxzZSk7XG59XG5pZiAodHlwZW9mIHdpbmRvdyAhPSBcInVuZGVmaW5lZFwiICYmIHdpbmRvd1tcIl9fV1NfREVCVUdfX1wiXSA9PSB1bmRlZmluZWQpIHtcbiAgICB3aW5kb3cuX19XU19ERUJVR19fID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5ucG1fcGFja2FnZV9jb25maWdfd3NkZWJ1ZyB8fCBmYWxzZSk7XG59XG5cbi8qKlxuIENvbmZpZ3VyZTogY29uZmlndXJlIGFzIGZvbGxvd3MgYEFwaXMuaW5zdGFuY2UoXCJ3czovL2xvY2FsaG9zdDo4MDkwXCIpLmluaXRfcHJvbWlzZWAuICBUaGlzIHJldHVybnMgYSBwcm9taXNlLCBvbmNlIHJlc29sdmVkIHRoZSBjb25uZWN0aW9uIGlzIHJlYWR5LlxuXG4gSW1wb3J0OiBpbXBvcnQgeyBBcGlzIH0gZnJvbSBcIkBncmFwaGVuZS9jaGFpblwiXG5cbiBTaG9ydC1oYW5kOiBBcGlzLmRiKFwibWV0aG9kXCIsIFwicGFybTFcIiwgMiwgMywgLi4uKS4gIFJldHVybnMgYSBwcm9taXNlIHdpdGggcmVzdWx0cy5cblxuIEFkZGl0aW9uYWwgdXNhZ2U6IEFwaXMuaW5zdGFuY2UoKS5kYl9hcGkoKS5leGVjKFwibWV0aG9kXCIsIFtcIm1ldGhvZFwiLCBcInBhcm0xXCIsIDIsIDMsIC4uLl0pLiAgUmV0dXJucyBhIHByb21pc2Ugd2l0aCByZXN1bHRzLlxuICovXG5cbmV4cG9ydHMuZGVmYXVsdCA9IHtcblxuICAgIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjazogZnVuY3Rpb24gc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuc3RhdHVzQ2IgPSBjYWxsYmFjaztcbiAgICAgICAgaWYgKGluc3QpIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgIEBhcmcge3N0cmluZ30gY3MgaXMgb25seSBwcm92aWRlZCBpbiB0aGUgZmlyc3QgY2FsbFxuICAgICBAcmV0dXJuIHtBcGlzfSBzaW5nbGV0b24gLi4gQ2hlY2sgQXBpcy5pbnN0YW5jZSgpLmluaXRfcHJvbWlzZSB0byBrbm93IHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgZXN0YWJsaXNoZWRcbiAgICAgKi9cbiAgICByZXNldDogZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICAgIHZhciBjcyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogXCJ3czovL2xvY2FsaG9zdDo4MDkwXCI7XG4gICAgICAgIHZhciBjb25uZWN0ID0gYXJndW1lbnRzWzFdO1xuXG4gICAgICAgIC8qXG4gICAgICAgICBpZiAoIGluc3QgKSB7XG4gICAgICAgICBpbnN0LmNsb3NlKCk7XG4gICAgICAgICBpbnN0ID0gbnVsbDtcbiAgICAgICAgIH1cbiAgICAgICAgIGluc3QgPSBuZXcgQXBpc0luc3RhbmNlKCk7XG4gICAgICAgICBpbnN0LnNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayh0aGlzLnN0YXR1c0NiKTtcbiAgICAgICAgICBpZiAoaW5zdCAmJiBjb25uZWN0KSB7XG4gICAgICAgICBpbnN0LmNvbm5lY3QoY3MpO1xuICAgICAgICAgfVxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKGluc3QpIHtcbiAgICAgICAgICAgIGluc3QucmVzZXQoY3MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5zdCA9IG5ldyBBcGlzSW5zdGFuY2UoKTtcbiAgICAgICAgICAgIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKHRoaXMuc3RhdHVzQ2IpO1xuICAgICAgICAgICAgaWYgKGluc3QgJiYgY29ubmVjdCkge1xuICAgICAgICAgICAgICAgIGluc3QuY29ubmVjdChjcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5zdDtcbiAgICB9LFxuICAgIGluc3RhbmNlOiBmdW5jdGlvbiBpbnN0YW5jZSgpIHtcbiAgICAgICAgdmFyIGNzID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiBcIndzOi8vbG9jYWxob3N0OjgwOTBcIjtcbiAgICAgICAgdmFyIGNvbm5lY3QgPSBhcmd1bWVudHNbMV07XG5cbiAgICAgICAgaWYgKCFpbnN0KSB7XG4gICAgICAgICAgICBpbnN0ID0gbmV3IEFwaXNJbnN0YW5jZSgpO1xuICAgICAgICAgICAgaW5zdC5zZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2sodGhpcy5zdGF0dXNDYik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5zdCAmJiBjb25uZWN0KSB7XG4gICAgICAgICAgICBpbnN0LmNvbm5lY3QoY3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluc3Q7XG4gICAgfSxcbiAgICBjaGFpbklkOiBmdW5jdGlvbiBjaGFpbklkKCkge1xuICAgICAgICByZXR1cm4gQXBpcy5pbnN0YW5jZSgpLmNoYWluX2lkO1xuICAgIH0sXG5cbiAgICBjbG9zZTogZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgICAgIGlmIChpbnN0KSB7XG4gICAgICAgICAgICBpbnN0LmNsb3NlKCk7XG4gICAgICAgICAgICBpbnN0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBkYjogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmRiX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIG5ldHdvcms6IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5uZXR3b3JrX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIGhpc3Rvcnk6IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5oaXN0b3J5X2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIGNyeXB0bzogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmNyeXB0b19hcGkoKS5leGVjKG1ldGhvZCwgdG9TdHJpbmdzKGFyZ3MpKVxufTtcblxudmFyIEFwaXNJbnN0YW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBBcGlzSW5zdGFuY2UoKSB7XG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBBcGlzSW5zdGFuY2UpO1xuXG4gICAgICAgIHRoaXMucmVzZXRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5yZXNldEludGVydmFsID0gbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDov57mjqVhcGlcbiAgICAgKiBAcGFyYW0gY3MgYXBp55qEdXJs5Zyw5Z2AXG4gICAgICovXG5cblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uIGNvbm5lY3QoY3MpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgICB2YXIgcnBjX3VzZXIgPSBcIlwiLFxuICAgICAgICAgICAgcnBjX3Bhc3N3b3JkID0gXCJcIjtcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgd2luZG93LmxvY2F0aW9uICYmIHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiBjcy5pbmRleE9mKFwid3NzOi8vXCIpIDwgMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2VjdXJlIGRvbWFpbnMgcmVxdWlyZSB3c3MgY29ubmVjdGlvblwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMud3NfcnBjID0gbmV3IF9DaGFpbldlYlNvY2tldDIuZGVmYXVsdChjcywgdGhpcy5zdGF0dXNDYik7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJOZXcgQ2hhaW5XZWJTb2NrZXRcIik7XG4gICAgICAgIHRoaXMuaW5pdF9wcm9taXNlID0gdGhpcy53c19ycGMubG9naW4ocnBjX3VzZXIsIHJwY19wYXNzd29yZCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMucmVzZXRJbnRlcnZhbCAhPSBudWxsKSBjbGVhckludGVydmFsKF90aGlzLnJlc2V0SW50ZXJ2YWwpO1xuICAgICAgICAgICAgX3RoaXMucmVzZXRJbnRlcnZhbCA9IG51bGw7XG4gICAgICAgICAgICBfdGhpcy5yZXNldGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJMb2dpbiBkb25lXCIpO1xuICAgICAgICAgICAgX3RoaXMuX2RiID0gbmV3IF9HcmFwaGVuZUFwaTIuZGVmYXVsdChfdGhpcy53c19ycGMsIFwiZGF0YWJhc2VcIik7XG4gICAgICAgICAgICBfdGhpcy5fbmV0ID0gbmV3IF9HcmFwaGVuZUFwaTIuZGVmYXVsdChfdGhpcy53c19ycGMsIFwibmV0d29ya19icm9hZGNhc3RcIik7XG4gICAgICAgICAgICBfdGhpcy5faGlzdCA9IG5ldyBfR3JhcGhlbmVBcGkyLmRlZmF1bHQoX3RoaXMud3NfcnBjLCBcImhpc3RvcnlcIik7XG4gICAgICAgICAgICBfdGhpcy5fY3J5cHQgPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzLndzX3JwYywgXCJjcnlwdG9cIik7XG4gICAgICAgICAgICB2YXIgZGJfcHJvbWlzZSA9IF90aGlzLl9kYi5pbml0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgLy9odHRwczovL2dpdGh1Yi5jb20vY3J5cHRvbm9tZXgvZ3JhcGhlbmUvd2lraS9jaGFpbi1sb2NrZWQtdHhcbiAgICAgICAgICAgICAgICByZXR1cm4gX3RoaXMuX2RiLmV4ZWMoXCJnZXRfY2hhaW5faWRcIiwgW10pLnRoZW4oZnVuY3Rpb24gKF9jaGFpbl9pZCkge1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5jaGFpbl9pZCA9IF9jaGFpbl9pZDtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX0NoYWluQ29uZmlnMi5kZWZhdWx0LnNldENoYWluSWQoX2NoYWluX2lkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtkYl9wcm9taXNlLCBfdGhpcy5fbmV0LmluaXQoKSwgX3RoaXMuX2hpc3QuaW5pdCgpLCBfdGhpcy5fY3J5cHQuaW5pdCgpLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoXCJBcGlJbnN0YW5jZVxcdENyeXB0byBBUEkgRXJyb3JcIiwgZSk7XG4gICAgICAgICAgICB9KV0pO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoX19XU19ERUJVR19fKSBjb25zb2xlLmxvZyhcIkFwaUluc3RhbmNlXFx0V2ViU29ja2V0IGNvbm5lY3QgRXJyb3JcIiwgZXJyKTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdCh7IG1lc3NhZ2U6IFwiQXBpSW5zdGFuY2VcXHRXZWJTb2NrZXQgY29ubmVjdCBFcnJvclwiLCBjb2RlOiBlcnIuY29kZSB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiBjbG9zZSgpIHtcbiAgICAgICAgaWYgKHRoaXMud3NfcnBjKSB0aGlzLndzX3JwYy5jbG9zZSgpO1xuICAgICAgICB0aGlzLndzX3JwYyA9IG51bGw7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiByZXNldChjcykge1xuICAgICAgICBpZiAoIXRoaXMucmVzZXRpbmcpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIF9fdGhpcyA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLnJlc2V0SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKF9fdGhpcy5zdGF0dXNDYikgX190aGlzLnN0YXR1c0NiKFwicmVjb25uZWN0XCIpO1xuICAgICAgICAgICAgICAgIF9fdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIF9fdGhpcy5jb25uZWN0KGNzKTtcbiAgICAgICAgICAgIH0sIDEwMDAwKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmRiX2FwaSA9IGZ1bmN0aW9uIGRiX2FwaSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RiO1xuICAgIH07XG5cbiAgICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLm5ldHdvcmtfYXBpID0gZnVuY3Rpb24gbmV0d29ya19hcGkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9uZXQ7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuaGlzdG9yeV9hcGkgPSBmdW5jdGlvbiBoaXN0b3J5X2FwaSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3Q7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuY3J5cHRvX2FwaSA9IGZ1bmN0aW9uIGNyeXB0b19hcGkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jcnlwdDtcbiAgICB9O1xuXG4gICAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5zZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2sgPSBmdW5jdGlvbiBzZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2soY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5zdGF0dXNDYiA9IGNhbGxiYWNrO1xuICAgIH07XG5cbiAgICByZXR1cm4gQXBpc0luc3RhbmNlO1xufSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbXCJkZWZhdWx0XCJdOyIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xudmFyIF90aGlzID0gdm9pZCAwO1xuXG52YXIgZWNjX2NvbmZpZyA9IHtcbiAgICBhZGRyZXNzX3ByZWZpeDogcHJvY2Vzcy5lbnYubnBtX2NvbmZpZ19fZ3JhcGhlbmVfZWNjX2RlZmF1bHRfYWRkcmVzc19wcmVmaXggfHwgXCJZWVdcIlxufTtcblxuX3RoaXMgPSB7XG4gICAgY29yZV9hc3NldDogXCJZT1lPXCIsXG4gICAgYWRkcmVzc19wcmVmaXg6IFwiWVlXXCIsXG4gICAgZXhwaXJlX2luX3NlY3M6IDE1LFxuICAgIGV4cGlyZV9pbl9zZWNzX3Byb3Bvc2FsOiAyNCAqIDYwICogNjAsXG4gICAgcmV2aWV3X2luX3NlY3NfY29tbWl0dGVlOiAyNCAqIDYwICogNjAsXG4gICAgbmV0d29ya3M6IHtcbiAgICAgICAgWU9ZT1c6IHtcbiAgICAgICAgICAgIGNvcmVfYXNzZXQ6IFwiWU9ZT1wiLFxuICAgICAgICAgICAgYWRkcmVzc19wcmVmaXg6IFwiWVlXXCIsXG4gICAgICAgICAgICBjaGFpbl9pZDogXCJhZTRmMjM0Yzc1MTk5ZjY3ZTUyNmM5NDc4Y2Y0OTlkZDZlOTRjMmI2NjgzMGVlNWM1OGQwODY4YTMxNzliYWY2XCJcbiAgICAgICAgfSxcbiAgICAgICAgVGVzdDoge1xuICAgICAgICAgICAgY29yZV9hc3NldDogXCJURVNUXCIsXG4gICAgICAgICAgICBhZGRyZXNzX3ByZWZpeDogXCJZWVdcIixcbiAgICAgICAgICAgIGNoYWluX2lkOiBcIjM1MDVlMzY3ZmU2Y2RlMjQzZjJhMWMzOWJkOGU1ODU1N2UyMzI3MWRkNmNiZjRiMjlhOGRjOGM0NGM5YWY4ZmVcIlxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKiBTZXQgYSBmZXcgcHJvcGVydGllcyBmb3Iga25vd24gY2hhaW4gSURzLiAqL1xuICAgIHNldENoYWluSWQ6IGZ1bmN0aW9uIHNldENoYWluSWQoY2hhaW5faWQpIHtcblxuICAgICAgICB2YXIgaSA9IHZvaWQgMCxcbiAgICAgICAgICAgIGxlbiA9IHZvaWQgMCxcbiAgICAgICAgICAgIG5ldHdvcmsgPSB2b2lkIDAsXG4gICAgICAgICAgICBuZXR3b3JrX25hbWUgPSB2b2lkIDAsXG4gICAgICAgICAgICByZWYgPSB2b2lkIDA7XG4gICAgICAgIHJlZiA9IE9iamVjdC5rZXlzKF90aGlzLm5ldHdvcmtzKTtcblxuICAgICAgICBmb3IgKGkgPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblxuICAgICAgICAgICAgbmV0d29ya19uYW1lID0gcmVmW2ldO1xuICAgICAgICAgICAgbmV0d29yayA9IF90aGlzLm5ldHdvcmtzW25ldHdvcmtfbmFtZV07XG5cbiAgICAgICAgICAgIGlmIChuZXR3b3JrLmNoYWluX2lkID09PSBjaGFpbl9pZCkge1xuXG4gICAgICAgICAgICAgICAgX3RoaXMubmV0d29ya19uYW1lID0gbmV0d29ya19uYW1lO1xuXG4gICAgICAgICAgICAgICAgaWYgKG5ldHdvcmsuYWRkcmVzc19wcmVmaXgpIHtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuYWRkcmVzc19wcmVmaXggPSBuZXR3b3JrLmFkZHJlc3NfcHJlZml4O1xuICAgICAgICAgICAgICAgICAgICBlY2NfY29uZmlnLmFkZHJlc3NfcHJlZml4ID0gbmV0d29yay5hZGRyZXNzX3ByZWZpeDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5ldHdvcmsuY29yZV9hc3NldCkge1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5jb3JlX2Fzc2V0ID0gbmV0d29yay5jb3JlX2Fzc2V0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNoYWluX2lkOlwiLCBjaGFpbl9pZCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJuZXR3b3JrX25hbWU6XCIsIG5ldHdvcmtfbmFtZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya19uYW1lOiBuZXR3b3JrX25hbWUsXG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcms6IG5ldHdvcmtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFfdGhpcy5uZXR3b3JrX25hbWUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVW5rbm93biBjaGFpbiBpZCAodGhpcyBtYXkgYmUgYSB0ZXN0bmV0KVwiLCBjaGFpbl9pZCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVzZXQ6IGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgICBfdGhpcy5jb3JlX2Fzc2V0ID0gXCJZT1lPXCI7XG4gICAgICAgIF90aGlzLmFkZHJlc3NfcHJlZml4ID0gXCJZWVdcIjtcbiAgICAgICAgZWNjX2NvbmZpZy5hZGRyZXNzX3ByZWZpeCA9IFwiWVlXXCI7XG4gICAgICAgIF90aGlzLmV4cGlyZV9pbl9zZWNzID0gMTU7XG4gICAgICAgIF90aGlzLmV4cGlyZV9pbl9zZWNzX3Byb3Bvc2FsID0gMjQgKiA2MCAqIDYwO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ2hhaW4gY29uZmlnIHJlc2V0XCIpO1xuICAgIH0sXG5cbiAgICBzZXRQcmVmaXg6IGZ1bmN0aW9uIHNldFByZWZpeCgpIHtcbiAgICAgICAgdmFyIHByZWZpeCA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogXCJZWVdcIjtcblxuICAgICAgICBfdGhpcy5hZGRyZXNzX3ByZWZpeCA9IHByZWZpeDtcbiAgICAgICAgZWNjX2NvbmZpZy5hZGRyZXNzX3ByZWZpeCA9IHByZWZpeDtcbiAgICB9XG59O1xuXG5leHBvcnRzLmRlZmF1bHQgPSBfdGhpcztcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1tcImRlZmF1bHRcIl07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfU2hhcmVkV2ViU29ja2V0ID0gcmVxdWlyZShcIi4vU2hhcmVkV2ViU29ja2V0XCIpO1xuXG52YXIgX1NoYXJlZFdlYlNvY2tldDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9TaGFyZWRXZWJTb2NrZXQpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG52YXIgV2ViU29ja2V0Q2xpZW50ID0gdm9pZCAwO1xuXG52YXIgQ2hhaW5XZWJTb2NrZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ2hhaW5XZWJTb2NrZXQod3Nfc2VydmVyLCBzdGF0dXNDYikge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBDaGFpbldlYlNvY2tldCk7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBXZWJTb2NrZXQgPT09IFwidW5kZWZpbmVkXCIgJiYgIXByb2Nlc3MuZW52LmJyb3dzZXIpIHtcbiAgICAgICAgICAgIFdlYlNvY2tldENsaWVudCA9IHJlcXVpcmUoXCJ3c1wiKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgV2ViU29ja2V0ICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgV2ViU29ja2V0Q2xpZW50ID0gcmVxdWlyZShcIlJlY29ubmVjdGluZ1dlYlNvY2tldFwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFdlYlNvY2tldENsaWVudCA9IFdlYlNvY2tldDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3RhdHVzQ2IgPSBzdGF0dXNDYjtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgISF3aW5kb3cuU2hhcmVkV29ya2VyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53cyA9IG5ldyBfU2hhcmVkV2ViU29ja2V0Mi5kZWZhdWx0KHdzX3NlcnZlciwgNTAwMCk7XG4gICAgICAgICAgICAgICAgaWYgKF9fV1NfREVCVUdfXykgY29uc29sZS5sb2coJy0tLS0tLS1TaGFyZWRXZWJTb2NrZXQtLS0tLS0tLS0nLCB0aGlzLndzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy53cyA9IG5ldyBXZWJTb2NrZXRDbGllbnQod3Nfc2VydmVyKTtcbiAgICAgICAgICAgICAgICBpZiAoX19XU19ERUJVR19fKSBjb25zb2xlLmxvZygnLS0tLS0tLVdlYlNvY2tldENsaWVudC0tLS0tLS0tLScsIHRoaXMud3MpO1xuICAgICAgICAgICAgICAgIHZhciBfX3RoaXMgPSB0aGlzO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLndzW1wicGluZ1wiXSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoZWNrU29ja2V0ID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX190aGlzLndzLnBpbmcoMCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud3MudGltZW91dEludGVydmFsID0gNTAwMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGVja1NvY2tldCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfX3RoaXMud3MucmVhZHlTdGF0ZSA9PSAzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX190aGlzLl9fY2xlYXJDaGVja1NvY2tldCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfX3RoaXMuc3RhdHVzQ2IpIF9fdGhpcy5zdGF0dXNDYihcImNsb3NlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcImludmFsaWQgd2Vic29ja2V0IFVSTDpcIiwgZXJyb3IpO1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudF9yZWplY3QpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY3VycmVudF9yZWplY3QgPSBudWxsO1xuICAgICAgICB0aGlzLmNvbm5lY3RfcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIF90aGlzLmN1cnJlbnRfcmVqZWN0ID0gcmVqZWN0O1xuICAgICAgICAgICAgX3RoaXMud3Mub24oXCJvcGVuXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoX19XU19ERUJVR19fKSBjb25zb2xlLmxvZyhcIm9ub3Blbi4uLlwiKTtcbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc3RhdHVzQ2IpIF90aGlzLnN0YXR1c0NiKFwib3BlblwiKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIF90aGlzLndzLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKF9fV1NfREVCVUdfXykgY29uc29sZS5sb2coXCJlcnJvci4uLlwiKTtcbiAgICAgICAgICAgICAgICBfdGhpcy5fX2NsZWFyQ2hlY2tTb2NrZXQoKTtcbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc3RhdHVzQ2IpIF90aGlzLnN0YXR1c0NiKFwiZXJyb3JcIik7XG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLmN1cnJlbnRfcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmN1cnJlbnRfcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIF90aGlzLndzLm9uKFwibWVzc2FnZVwiLCBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5saXN0ZW5lcihKU09OLnBhcnNlKG1lc3NhZ2UpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgX3RoaXMud3Mub24oXCJjbG9zZVwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoX19XU19ERUJVR19fKSBjb25zb2xlLmxvZyhcIm9uY2xvc2UuLi5cIiwgZXZlbnQpO1xuICAgICAgICAgICAgICAgIF90aGlzLl9fY2xlYXJDaGVja1NvY2tldCgpO1xuICAgICAgICAgICAgICAgIGlmIChfdGhpcy5zdGF0dXNDYikgX3RoaXMuc3RhdHVzQ2IoXCJjbG9zZWRcIik7XG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLmN1cnJlbnRfcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmN1cnJlbnRfcmVqZWN0KGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuY2JJZCA9IDA7XG4gICAgICAgIHRoaXMuY2JzID0ge307XG4gICAgICAgIHRoaXMuc3VicyA9IHt9O1xuICAgICAgICB0aGlzLnVuc3ViID0ge307XG4gICAgfVxuXG4gICAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLl9fY2xlYXJDaGVja1NvY2tldCA9IGZ1bmN0aW9uIF9fY2xlYXJDaGVja1NvY2tldCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY2hlY2tTb2NrZXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmNoZWNrU29ja2V0KTtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tTb2NrZXQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gY2FsbChwYXJhbXMpIHtcbiAgICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIG1ldGhvZCA9IHBhcmFtc1sxXTtcbiAgICAgICAgaWYgKF9fV1NfREVCVUdfXykgY29uc29sZS5sb2coXCJbQ2hhaW5XZWJTb2NrZXRdID4tLS0tIGNhbGwgLS0tLS0+ICBcXFwiaWRcXFwiOlwiICsgKHRoaXMuY2JJZCArIDEpLCBKU09OLnN0cmluZ2lmeShwYXJhbXMpKTtcblxuICAgICAgICB0aGlzLmNiSWQgKz0gMTtcblxuICAgICAgICBpZiAobWV0aG9kID09PSBcInNldF9zdWJzY3JpYmVfY2FsbGJhY2tcIiB8fCBtZXRob2QgPT09IFwic3Vic2NyaWJlX3RvX21hcmtldFwiIHx8IG1ldGhvZCA9PT0gXCJicm9hZGNhc3RfdHJhbnNhY3Rpb25fd2l0aF9jYWxsYmFja1wiIHx8IG1ldGhvZCA9PT0gXCJzZXRfcGVuZGluZ190cmFuc2FjdGlvbl9jYWxsYmFja1wiKSB7XG4gICAgICAgICAgICAvLyBTdG9yZSBjYWxsYmFjayBpbiBzdWJzIG1hcFxuICAgICAgICAgICAgdGhpcy5zdWJzW3RoaXMuY2JJZF0gPSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IHBhcmFtc1syXVswXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gUmVwbGFjZSBjYWxsYmFjayB3aXRoIHRoZSBjYWxsYmFjayBpZFxuICAgICAgICAgICAgcGFyYW1zWzJdWzBdID0gdGhpcy5jYklkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gXCJ1bnN1YnNjcmliZV9mcm9tX21hcmtldFwiIHx8IG1ldGhvZCA9PT0gXCJ1bnN1YnNjcmliZV9mcm9tX2FjY291bnRzXCIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGFyYW1zWzJdWzBdICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaXJzdCBwYXJhbWV0ZXIgb2YgdW5zdWIgbXVzdCBiZSB0aGUgb3JpZ2luYWwgY2FsbGJhY2tcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciB1blN1YkNiID0gcGFyYW1zWzJdLnNwbGljZSgwLCAxKVswXTtcblxuICAgICAgICAgICAgLy8gRmluZCB0aGUgY29ycmVzcG9uZGluZyBzdWJzY3JpcHRpb25cbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMuc3Vicykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN1YnNbaWRdLmNhbGxiYWNrID09PSB1blN1YkNiKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudW5zdWJbdGhpcy5jYklkXSA9IGlkO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgICAgICAgIG1ldGhvZDogXCJjYWxsXCIsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtc1xuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LmlkID0gdGhpcy5jYklkO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiISEhIENoYWluV2ViU29ja2V0IGNhbGxcIik7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBfdGhpczIuY2JzW190aGlzMi5jYklkXSA9IHtcbiAgICAgICAgICAgICAgICB0aW1lOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgICAgIHJlc29sdmU6IHJlc29sdmUsXG4gICAgICAgICAgICAgICAgcmVqZWN0OiByZWplY3RcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvKnRoaXMud3Mub25lcnJvciA9IChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiISEhIENoYWluV2ViU29ja2V0IEVycm9yIFwiLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH07Ki9cbiAgICAgICAgICAgIF90aGlzMi53cy5zZW5kKEpTT04uc3RyaW5naWZ5KHJlcXVlc3QpKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5saXN0ZW5lciA9IGZ1bmN0aW9uIGxpc3RlbmVyKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChfX1dTX0RFQlVHX18pIGNvbnNvbGUubG9nKFwiW0NoYWluV2ViU29ja2V0XSA8LS0tLSByZXBseSAtLS0tPFwiLCBKU09OLnN0cmluZ2lmeShyZXNwb25zZSkpO1xuXG4gICAgICAgIHZhciBzdWIgPSBmYWxzZSxcbiAgICAgICAgICAgIGNhbGxiYWNrID0gbnVsbDtcblxuICAgICAgICBpZiAocmVzcG9uc2UubWV0aG9kID09PSBcIm5vdGljZVwiKSB7XG4gICAgICAgICAgICBzdWIgPSB0cnVlO1xuICAgICAgICAgICAgcmVzcG9uc2UuaWQgPSByZXNwb25zZS5wYXJhbXNbMF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXN1Yikge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSB0aGlzLmNic1tyZXNwb25zZS5pZF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHRoaXMuc3Vic1tyZXNwb25zZS5pZF0uY2FsbGJhY2s7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2FsbGJhY2sgJiYgIXN1Yikge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sucmVqZWN0KHJlc3BvbnNlLmVycm9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sucmVzb2x2ZShyZXNwb25zZS5yZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuY2JzW3Jlc3BvbnNlLmlkXTtcblxuICAgICAgICAgICAgaWYgKHRoaXMudW5zdWJbcmVzcG9uc2UuaWRdKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuc3Vic1t0aGlzLnVuc3ViW3Jlc3BvbnNlLmlkXV07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMudW5zdWJbcmVzcG9uc2UuaWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGNhbGxiYWNrICYmIHN1Yikge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UucGFyYW1zWzFdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChfX1dTX0RFQlVHX18pIGNvbnNvbGUubG9nKFwiV2FybmluZzogdW5rbm93biB3ZWJzb2NrZXQgcmVzcG9uc2U6IFwiLCByZXNwb25zZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24gbG9naW4odXNlciwgcGFzc3dvcmQpIHtcbiAgICAgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuY29ubmVjdF9wcm9taXNlLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzMy5jYWxsKFsxLCBcImxvZ2luXCIsIFt1c2VyLCBwYXNzd29yZF1dKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIGNsb3NlKCkge1xuICAgICAgICB0aGlzLndzLmNsb3NlKCk7XG4gICAgfTtcblxuICAgIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgICBpZiAodGhpcy53cy5yZXNldCkgdGhpcy53cy5yZXNldCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gQ2hhaW5XZWJTb2NrZXQ7XG59KCk7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IENoYWluV2ViU29ja2V0O1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzW1wiZGVmYXVsdFwiXTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxudmFyIEdyYXBoZW5lQXBpID0gZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEdyYXBoZW5lQXBpKHdzX3JwYywgYXBpX25hbWUpIHtcbiAgICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEdyYXBoZW5lQXBpKTtcblxuICAgICAgICB0aGlzLndzX3JwYyA9IHdzX3JwYztcbiAgICAgICAgdGhpcy5hcGlfbmFtZSA9IGFwaV9uYW1lO1xuICAgIH1cblxuICAgIEdyYXBoZW5lQXBpLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gdGhpcy53c19ycGMuY2FsbChbMSwgdGhpcy5hcGlfbmFtZSwgW11dKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgc2VsZi5hcGlfaWQgPSByZXNwb25zZTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgR3JhcGhlbmVBcGkucHJvdG90eXBlLmV4ZWMgPSBmdW5jdGlvbiBleGVjKG1ldGhvZCwgcGFyYW1zKSB7XG4gICAgICAgIHJldHVybiB0aGlzLndzX3JwYy5jYWxsKFt0aGlzLmFwaV9pZCwgbWV0aG9kLCBwYXJhbXNdKS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiISEhIEdyYXBoZW5lQXBpIGVycm9yOiBcIiwgbWV0aG9kLCBwYXJhbXMsIGVycm9yLCBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xuICAgICAgICAgICAgLy90aHJvdyBlcnJvcjtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiBHcmFwaGVuZUFwaTtcbn0oKTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gR3JhcGhlbmVBcGk7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbXCJkZWZhdWx0XCJdOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuLyoqXG4gKiBDcmVhdGVkIGJ5IG5lY2tsYWNlIG9uIDE3LTUtMy5cbiAqL1xuXG52YXIgd2ViU29ja2V0V29ya2VyID0gJ3ZhciBfdHlwZW9mPXR5cGVvZiBTeW1ib2w9PT1cImZ1bmN0aW9uXCImJnR5cGVvZiBTeW1ib2wuaXRlcmF0b3I9PT1cInN5bWJvbFwiP2Z1bmN0aW9uKGEpe3JldHVybiB0eXBlb2YgYX06ZnVuY3Rpb24oYSl7cmV0dXJuIGEmJnR5cGVvZiBTeW1ib2w9PT1cImZ1bmN0aW9uXCImJmEuY29uc3RydWN0b3I9PT1TeW1ib2wmJmEhPT1TeW1ib2wucHJvdG90eXBlP1wic3ltYm9sXCI6dHlwZW9mIGF9O3ZhciBwb3J0cz1bXTt2YXIgc29ja2V0PW51bGw7dmFyIHNlcnZlcj1cIlwiO3ZhciB3c190aW1lb3V0PTUwMDA7dmFyIHBpbmdTb2NrZXQ9bnVsbDt2YXIgY2xvc2Vfbm9ybWFsPWZhbHNlO2Z1bmN0aW9uIGJyb2FkY2FzdChiKXtmb3IodmFyIGE9MDthPHBvcnRzLmxlbmd0aDthKyspe3BvcnRzW2FdLnBvc3RNZXNzYWdlKGIpfX12YXIgd2NvbnNvbGU9e2Vycm9yOmZ1bmN0aW9uIGVycm9yKGIsYSl7d2NvbnNvbGUucG9zdChcImVycm9yXCIsYixhKX0sbG9nOmZ1bmN0aW9uIGxvZyhiLGEpe3djb25zb2xlLnBvc3QoXCJsb2dcIixiLGEpfSxtc2c6ZnVuY3Rpb24gbXNnKGEpe2Jyb2FkY2FzdChhKX0scG9zdDpmdW5jdGlvbiBwb3N0KGEsYyxiKXticm9hZGNhc3Qoe3RhZzphLHRpdGxlOmMsbXNnOmJ9KX0scG9zdFRhcmdldDpmdW5jdGlvbiBwb3N0VGFyZ2V0KGEsYil7YS5wb3N0TWVzc2FnZShiKX19O2Z1bmN0aW9uIGluaXRXUyhhKXt2YXIgYj1hcmd1bWVudHMubGVuZ3RoPjEmJmFyZ3VtZW50c1sxXSE9PXVuZGVmaW5lZD9hcmd1bWVudHNbMV06NTAwMDtjbG9zZV9ub3JtYWw9ZmFsc2U7aWYoc29ja2V0PT09bnVsbCl7c29ja2V0PW5ldyBXZWJTb2NrZXQoYSk7c29ja2V0LnRpbWVvdXRJbnRlcnZhbD1iO3NvY2tldC5vbm9wZW49ZnVuY3Rpb24oKXticm9hZGNhc3Qoe2V2ZW50Olwib25vcGVuXCJ9KX07c29ja2V0Lm9uZXJyb3I9ZnVuY3Rpb24oZCl7YnJvYWRjYXN0KHtldmVudDpcIm9uZXJyb3JcIixkYXRhOmR9KTtjbGVhckludGVydmFsKHBpbmdTb2NrZXQpfTtzb2NrZXQub25tZXNzYWdlPWZ1bmN0aW9uKGQpe2Jyb2FkY2FzdCh7ZXZlbnQ6XCJvbm1lc3NhZ2VcIixkYXRhOmQuZGF0YX0pfTtzb2NrZXQub25jbG9zZT1mdW5jdGlvbihkKXticm9hZGNhc3Qoe2V2ZW50Olwib25jbG9zZVwiLGRhdGE6ZH0pO2NsZWFySW50ZXJ2YWwocGluZ1NvY2tldCl9O3BpbmdTb2NrZXQ9c2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtpZihzb2NrZXQucmVhZHlTdGF0ZT09Myl7YnJvYWRjYXN0KHtldmVudDpcIm9uY2xvc2VcIixkYXRhOntjb2RlOmNsb3NlX25vcm1hbD8xMDAwOjEwMDV9fSk7Y2xlYXJJbnRlcnZhbChwaW5nU29ja2V0KX19LDEwMDApfX1mdW5jdGlvbiBwcm9jTXNnKGMsYSl7aWYoKHR5cGVvZiBjPT09XCJ1bmRlZmluZWRcIj9cInVuZGVmaW5lZFwiOl90eXBlb2YoYykpPT09XCJvYmplY3RcIil7aWYoISFjLm1ldGhvZCl7c3dpdGNoKGMubWV0aG9kKXtjYXNlXCJzZW5kXCI6aWYoISFzb2NrZXQpe3NvY2tldC5zZW5kKGMucGFyc1swXSl9YnJlYWs7Y2FzZVwiY2xvc2VcIjpjbG9zZV9ub3JtYWw9dHJ1ZTtwb3J0cy5jbGVhbigpO2lmKCEhc29ja2V0KXtzb2NrZXQuY2xvc2UoKX1icmVhaztjYXNlXCJpbml0XCI6dmFyIGI9Yy5wYXJzWzBdO3dzX3RpbWVvdXQ9Yy5wYXJzWzFdO2lmKGIhPT1zZXJ2ZXIpe3NlcnZlcj1iO2luaXRXUyhzZXJ2ZXIsd3NfdGltZW91dCl9YnJlYWs7Y2FzZVwicmVzZXRcIjpjbG9zZV9ub3JtYWw9dHJ1ZTtzb2NrZXQuY2xvc2UoKTtzb2NrZXQ9bnVsbDtpbml0V1Moc2VydmVyLHdzX3RpbWVvdXQpO2JyZWFrO2Nhc2VcInBpbmdcIjp3Y29uc29sZS5wb3N0VGFyZ2V0KGEse3RhZzpcImxvZ1wiLHRpdGxlOlwicGluZ1wiLG1zZzpzb2NrZXQucmVhZHlTdGF0ZX0pO2JyZWFrO2RlZmF1bHQ6d2NvbnNvbGUucG9zdFRhcmdldChhLHt0YWc6XCJlcnJvclwiLHRpdGxlOlwid29ya2VyXCIsbXNnOlwiVW5zdXBwb3J0ZWQgbWV0aG9kXCJ9KTticmVha319fX1vbmNvbm5lY3Q9ZnVuY3Rpb24gb25jb25uZWN0KGIpe3ZhciBhPWIucG9ydHNbMF07cG9ydHMucHVzaChhKTthLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsZnVuY3Rpb24oYyl7cHJvY01zZyhjLmRhdGEsYSl9KTthLnN0YXJ0KCk7YS5wb3N0TWVzc2FnZSh7ZXZlbnQ6XCJvbmNvbm5lY3RcIixkYXRhOnBvcnRzLmxlbmd0aH0pfTsnO1xuXG52YXIgU2hhcmVkV2ViU29ja2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFNoYXJlZFdlYlNvY2tldCh1cmwsIHRpbWVvdXQpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgU2hhcmVkV2ViU29ja2V0KTtcblxuICAgICAgICB0aGlzLndzX3VybCA9IHVybDtcbiAgICAgICAgdGhpcy50aW1lb3V0ID0gdGltZW91dDtcbiAgICAgICAgdGhpcy5vbm9wZW4gPSBudWxsO1xuICAgICAgICB0aGlzLm9uZXJyb3IgPSBudWxsO1xuICAgICAgICB0aGlzLm9ubWVzc2FnZSA9IG51bGw7XG4gICAgICAgIHRoaXMub25jbG9zZSA9IG51bGw7XG4gICAgICAgIHRoaXMuV2ViU29ja2V0V29ya2VyID0gbnVsbDtcbiAgICAgICAgdmFyIHdvcmtlcl9ibG9iID0gbmV3IEJsb2IoW3dlYlNvY2tldFdvcmtlcl0pO1xuICAgICAgICB0aGlzLldlYlNvY2tldFdvcmtlciA9IG5ldyBTaGFyZWRXb3JrZXIod2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwod29ya2VyX2Jsb2IpKTtcbiAgICAgICAgLy90aGlzLldlYlNvY2tldFdvcmtlciA9IG5ldyBTaGFyZWRXb3JrZXIoXCJ0ZXN0V29ya2VyLmpzXCIpO1xuXG4gICAgICAgIHRoaXMuV2ViU29ja2V0V29ya2VyLnBvcnQub25tZXNzYWdlID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnPT09PT09PT09PT09PT09PT0nLCBvYmopO1xuICAgICAgICAgICAgX3RoaXMuX3Byb2NPbk1lc3NhZ2Uob2JqLmRhdGEpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLldlYlNvY2tldFdvcmtlci5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB0aGlzLl9wcm9jRXJyb3IoZS5tZXNzYWdlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8qXG4gICAgICAgIHRoaXMuV2ViU29ja2V0V29ya2VyLm9uZXJyb3IgPSAoZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fcHJvY0Vycm9yKGUubWVzc2FnZSk7XG4gICAgICAgIH07XG4gICAgICAgICovXG4gICAgICAgIC8vdGhpcy5XZWJTb2NrZXRXb3JrZXIucG9ydC5zdGFydCgpXG4gICAgfVxuXG4gICAgU2hhcmVkV2ViU29ja2V0LnByb3RvdHlwZS5fcHJvY09uTWVzc2FnZSA9IGZ1bmN0aW9uIF9wcm9jT25NZXNzYWdlKG9iaikge1xuICAgICAgICAvL2NvbnNvbGUubG9nKCcwPTA9MD0wPTA9JyxvYmopXG4gICAgICAgIGlmICghIW9iai50YWcpIHtcbiAgICAgICAgICAgIHN3aXRjaCAob2JqLnRhZykge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJlcnJvclwiOlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKG9iai50aXRsZSwgb2JqLm1zZyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJsb2dcIjpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cob2JqLnRpdGxlLCBvYmoubXNnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoISFvYmouZXZlbnQpIHtcbiAgICAgICAgICAgIHN3aXRjaCAob2JqLmV2ZW50KSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcIm9ub3BlblwiOlxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vbm9wZW4pIHRoaXMub25vcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJvbmVycm9yXCI6XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uZXJyb3IpIHRoaXMub25lcnJvcihvYmouZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJvbm1lc3NhZ2VcIjpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub25tZXNzYWdlKSB0aGlzLm9ubWVzc2FnZShvYmouZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJvbmNsb3NlXCI6XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uY2xvc2UpIHRoaXMub25jbG9zZShvYmouZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJvbmNvbm5lY3RcIjpcbiAgICAgICAgICAgICAgICAgICAgLy/kuI5zaGFyZWR3b3JrZXLov57mjqXmiJDlip9cbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcInBvcnTmlbDph4/vvJpcIiwgb2JqLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAob2JqLmRhdGEgPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5XZWJTb2NrZXRXb3JrZXIucG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBcImluaXRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzOiBbdGhpcy53c191cmwsIHRoaXMudGltZW91dF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIFNoYXJlZFdlYlNvY2tldC5wcm90b3R5cGUuX3Byb2NFcnJvciA9IGZ1bmN0aW9uIF9wcm9jRXJyb3IoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgIH07XG5cbiAgICBTaGFyZWRXZWJTb2NrZXQucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbiBzZW5kKHN0cikge1xuICAgICAgICB0aGlzLldlYlNvY2tldFdvcmtlci5wb3J0LnBvc3RNZXNzYWdlKHsgbWV0aG9kOiBcInNlbmRcIiwgcGFyczogW3N0cl0gfSk7XG4gICAgfTtcblxuICAgIFNoYXJlZFdlYlNvY2tldC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiBjbG9zZSgpIHtcbiAgICAgICAgdGhpcy5XZWJTb2NrZXRXb3JrZXIucG9ydC5wb3N0TWVzc2FnZSh7IG1ldGhvZDogXCJjbG9zZVwiIH0pO1xuICAgIH07XG5cbiAgICBTaGFyZWRXZWJTb2NrZXQucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICAgIHRoaXMuV2ViU29ja2V0V29ya2VyLnBvcnQucG9zdE1lc3NhZ2UoeyBtZXRob2Q6IFwicmVzZXRcIiB9KTtcbiAgICB9O1xuXG4gICAgU2hhcmVkV2ViU29ja2V0LnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICAgICBzd2l0Y2ggKGV2ZW50KSB7XG4gICAgICAgICAgICBjYXNlIFwib3BlblwiOlxuICAgICAgICAgICAgICAgIHRoaXMub25vcGVuID0gY2FsbGJhY2s7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZXJyb3JcIjpcbiAgICAgICAgICAgICAgICB0aGlzLm9uZXJyb3IgPSBjYWxsYmFjaztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJtZXNzYWdlXCI6XG4gICAgICAgICAgICAgICAgdGhpcy5vbm1lc3NhZ2UgPSBjYWxsYmFjaztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJjbG9zZVwiOlxuICAgICAgICAgICAgICAgIHRoaXMub25jbG9zZSA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBTaGFyZWRXZWJTb2NrZXQ7XG59KCk7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IFNoYXJlZFdlYlNvY2tldDtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIi8vIE1JVCBMaWNlbnNlOlxyXG4vL1xyXG4vLyBDb3B5cmlnaHQgKGMpIDIwMTAtMjAxMiwgSm9lIFdhbG5lc1xyXG4vL1xyXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XHJcbi8vIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcclxuLy8gaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xyXG4vLyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXHJcbi8vIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xyXG4vLyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxyXG4vL1xyXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxyXG4vLyBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cclxuLy9cclxuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxyXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcclxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXHJcbi8vIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcclxuLy8gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcclxuLy8gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxyXG4vLyBUSEUgU09GVFdBUkUuXHJcblxyXG4vKipcclxuICogVGhpcyBiZWhhdmVzIGxpa2UgYSBXZWJTb2NrZXQgaW4gZXZlcnkgd2F5LCBleGNlcHQgaWYgaXQgZmFpbHMgdG8gY29ubmVjdCxcclxuICogb3IgaXQgZ2V0cyBkaXNjb25uZWN0ZWQsIGl0IHdpbGwgcmVwZWF0ZWRseSBwb2xsIHVudGlsIGl0IHN1Y2Nlc3NmdWxseSBjb25uZWN0c1xyXG4gKiBhZ2Fpbi5cclxuICpcclxuICogSXQgaXMgQVBJIGNvbXBhdGlibGUsIHNvIHdoZW4geW91IGhhdmU6XHJcbiAqICAgd3MgPSBuZXcgV2ViU29ja2V0KCd3czovLy4uLi4nKTtcclxuICogeW91IGNhbiByZXBsYWNlIHdpdGg6XHJcbiAqICAgd3MgPSBuZXcgUmVjb25uZWN0aW5nV2ViU29ja2V0KCd3czovLy4uLi4nKTtcclxuICpcclxuICogVGhlIGV2ZW50IHN0cmVhbSB3aWxsIHR5cGljYWxseSBsb29rIGxpa2U6XHJcbiAqICBvbmNvbm5lY3RpbmdcclxuICogIG9ub3BlblxyXG4gKiAgb25tZXNzYWdlXHJcbiAqICBvbm1lc3NhZ2VcclxuICogIG9uY2xvc2UgLy8gbG9zdCBjb25uZWN0aW9uXHJcbiAqICBvbmNvbm5lY3RpbmdcclxuICogIG9ub3BlbiAgLy8gc29tZXRpbWUgbGF0ZXIuLi5cclxuICogIG9ubWVzc2FnZVxyXG4gKiAgb25tZXNzYWdlXHJcbiAqICBldGMuLi5cclxuICpcclxuICogSXQgaXMgQVBJIGNvbXBhdGlibGUgd2l0aCB0aGUgc3RhbmRhcmQgV2ViU29ja2V0IEFQSSwgYXBhcnQgZnJvbSB0aGUgZm9sbG93aW5nIG1lbWJlcnM6XHJcbiAqXHJcbiAqIC0gYGJ1ZmZlcmVkQW1vdW50YFxyXG4gKiAtIGBleHRlbnNpb25zYFxyXG4gKiAtIGBiaW5hcnlUeXBlYFxyXG4gKlxyXG4gKiBMYXRlc3QgdmVyc2lvbjogaHR0cHM6Ly9naXRodWIuY29tL2pvZXdhbG5lcy9yZWNvbm5lY3Rpbmctd2Vic29ja2V0L1xyXG4gKiAtIEpvZSBXYWxuZXNcclxuICpcclxuICogU3ludGF4XHJcbiAqID09PT09PVxyXG4gKiB2YXIgc29ja2V0ID0gbmV3IFJlY29ubmVjdGluZ1dlYlNvY2tldCh1cmwsIHByb3RvY29scywgb3B0aW9ucyk7XHJcbiAqXHJcbiAqIFBhcmFtZXRlcnNcclxuICogPT09PT09PT09PVxyXG4gKiB1cmwgLSBUaGUgdXJsIHlvdSBhcmUgY29ubmVjdGluZyB0by5cclxuICogcHJvdG9jb2xzIC0gT3B0aW9uYWwgc3RyaW5nIG9yIGFycmF5IG9mIHByb3RvY29scy5cclxuICogb3B0aW9ucyAtIFNlZSBiZWxvd1xyXG4gKlxyXG4gKiBPcHRpb25zXHJcbiAqID09PT09PT1cclxuICogT3B0aW9ucyBjYW4gZWl0aGVyIGJlIHBhc3NlZCB1cG9uIGluc3RhbnRpYXRpb24gb3Igc2V0IGFmdGVyIGluc3RhbnRpYXRpb246XHJcbiAqXHJcbiAqIHZhciBzb2NrZXQgPSBuZXcgUmVjb25uZWN0aW5nV2ViU29ja2V0KHVybCwgbnVsbCwgeyBkZWJ1ZzogdHJ1ZSwgcmVjb25uZWN0SW50ZXJ2YWw6IDQwMDAgfSk7XHJcbiAqXHJcbiAqIG9yXHJcbiAqXHJcbiAqIHZhciBzb2NrZXQgPSBuZXcgUmVjb25uZWN0aW5nV2ViU29ja2V0KHVybCk7XHJcbiAqIHNvY2tldC5kZWJ1ZyA9IHRydWU7XHJcbiAqIHNvY2tldC5yZWNvbm5lY3RJbnRlcnZhbCA9IDQwMDA7XHJcbiAqXHJcbiAqIGRlYnVnXHJcbiAqIC0gV2hldGhlciB0aGlzIGluc3RhbmNlIHNob3VsZCBsb2cgZGVidWcgbWVzc2FnZXMuIEFjY2VwdHMgdHJ1ZSBvciBmYWxzZS4gRGVmYXVsdDogZmFsc2UuXHJcbiAqXHJcbiAqIGF1dG9tYXRpY09wZW5cclxuICogLSBXaGV0aGVyIG9yIG5vdCB0aGUgd2Vic29ja2V0IHNob3VsZCBhdHRlbXB0IHRvIGNvbm5lY3QgaW1tZWRpYXRlbHkgdXBvbiBpbnN0YW50aWF0aW9uLiBUaGUgc29ja2V0IGNhbiBiZSBtYW51YWxseSBvcGVuZWQgb3IgY2xvc2VkIGF0IGFueSB0aW1lIHVzaW5nIHdzLm9wZW4oKSBhbmQgd3MuY2xvc2UoKS5cclxuICpcclxuICogcmVjb25uZWN0SW50ZXJ2YWxcclxuICogLSBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheSBiZWZvcmUgYXR0ZW1wdGluZyB0byByZWNvbm5lY3QuIEFjY2VwdHMgaW50ZWdlci4gRGVmYXVsdDogMTAwMC5cclxuICpcclxuICogbWF4UmVjb25uZWN0SW50ZXJ2YWxcclxuICogLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5IGEgcmVjb25uZWN0aW9uIGF0dGVtcHQuIEFjY2VwdHMgaW50ZWdlci4gRGVmYXVsdDogMzAwMDAuXHJcbiAqXHJcbiAqIHJlY29ubmVjdERlY2F5XHJcbiAqIC0gVGhlIHJhdGUgb2YgaW5jcmVhc2Ugb2YgdGhlIHJlY29ubmVjdCBkZWxheS4gQWxsb3dzIHJlY29ubmVjdCBhdHRlbXB0cyB0byBiYWNrIG9mZiB3aGVuIHByb2JsZW1zIHBlcnNpc3QuIEFjY2VwdHMgaW50ZWdlciBvciBmbG9hdC4gRGVmYXVsdDogMS41LlxyXG4gKlxyXG4gKiB0aW1lb3V0SW50ZXJ2YWxcclxuICogLSBUaGUgbWF4aW11bSB0aW1lIGluIG1pbGxpc2Vjb25kcyB0byB3YWl0IGZvciBhIGNvbm5lY3Rpb24gdG8gc3VjY2VlZCBiZWZvcmUgY2xvc2luZyBhbmQgcmV0cnlpbmcuIEFjY2VwdHMgaW50ZWdlci4gRGVmYXVsdDogMjAwMC5cclxuICpcclxuICovXHJcbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XHJcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAgICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpe1xyXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBnbG9iYWwuUmVjb25uZWN0aW5nV2ViU29ja2V0ID0gZmFjdG9yeSgpO1xyXG4gICAgfVxyXG59KSh0aGlzLCBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09IFwidW5kZWZpbmVkXCIgfHwgISgnV2ViU29ja2V0JyBpbiB3aW5kb3cpKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIFJlY29ubmVjdGluZ1dlYlNvY2tldCh1cmwsIHByb3RvY29scywgb3B0aW9ucykge1xyXG5cclxuICAgICAgICAvLyBEZWZhdWx0IHNldHRpbmdzXHJcbiAgICAgICAgdmFyIHNldHRpbmdzID0ge1xyXG5cclxuICAgICAgICAgICAgLyoqIFdoZXRoZXIgdGhpcyBpbnN0YW5jZSBzaG91bGQgbG9nIGRlYnVnIG1lc3NhZ2VzLiAqL1xyXG4gICAgICAgICAgICBkZWJ1ZzogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvKiogV2hldGhlciBvciBub3QgdGhlIHdlYnNvY2tldCBzaG91bGQgYXR0ZW1wdCB0byBjb25uZWN0IGltbWVkaWF0ZWx5IHVwb24gaW5zdGFudGlhdGlvbi4gKi9cclxuICAgICAgICAgICAgYXV0b21hdGljT3BlbjogdHJ1ZSxcclxuXHJcbiAgICAgICAgICAgIC8qKiBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheSBiZWZvcmUgYXR0ZW1wdGluZyB0byByZWNvbm5lY3QuICovXHJcbiAgICAgICAgICAgIHJlY29ubmVjdEludGVydmFsOiAxMDAwLFxyXG4gICAgICAgICAgICAvKiogVGhlIG1heGltdW0gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheSBhIHJlY29ubmVjdGlvbiBhdHRlbXB0LiAqL1xyXG4gICAgICAgICAgICBtYXhSZWNvbm5lY3RJbnRlcnZhbDogMzAwMDAsXHJcbiAgICAgICAgICAgIC8qKiBUaGUgcmF0ZSBvZiBpbmNyZWFzZSBvZiB0aGUgcmVjb25uZWN0IGRlbGF5LiBBbGxvd3MgcmVjb25uZWN0IGF0dGVtcHRzIHRvIGJhY2sgb2ZmIHdoZW4gcHJvYmxlbXMgcGVyc2lzdC4gKi9cclxuICAgICAgICAgICAgcmVjb25uZWN0RGVjYXk6IDEuNSxcclxuXHJcbiAgICAgICAgICAgIC8qKiBUaGUgbWF4aW11bSB0aW1lIGluIG1pbGxpc2Vjb25kcyB0byB3YWl0IGZvciBhIGNvbm5lY3Rpb24gdG8gc3VjY2VlZCBiZWZvcmUgY2xvc2luZyBhbmQgcmV0cnlpbmcuICovXHJcbiAgICAgICAgICAgIHRpbWVvdXRJbnRlcnZhbDogMjAwMCxcclxuXHJcbiAgICAgICAgICAgIC8qKiBUaGUgbWF4aW11bSBudW1iZXIgb2YgcmVjb25uZWN0aW9uIGF0dGVtcHRzIHRvIG1ha2UuIFVubGltaXRlZCBpZiBudWxsLiAqL1xyXG4gICAgICAgICAgICBtYXhSZWNvbm5lY3RBdHRlbXB0czogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8qKiBUaGUgYmluYXJ5IHR5cGUsIHBvc3NpYmxlIHZhbHVlcyAnYmxvYicgb3IgJ2FycmF5YnVmZmVyJywgZGVmYXVsdCAnYmxvYicuICovXHJcbiAgICAgICAgICAgIGJpbmFyeVR5cGU6ICdibG9iJ1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIW9wdGlvbnMpIHsgb3B0aW9ucyA9IHt9OyB9XHJcblxyXG4gICAgICAgIC8vIE92ZXJ3cml0ZSBhbmQgZGVmaW5lIHNldHRpbmdzIHdpdGggb3B0aW9ucyBpZiB0aGV5IGV4aXN0LlxyXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzZXR0aW5ncykge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnNba2V5XSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IG9wdGlvbnNba2V5XTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IHNldHRpbmdzW2tleV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFRoZXNlIHNob3VsZCBiZSB0cmVhdGVkIGFzIHJlYWQtb25seSBwcm9wZXJ0aWVzXHJcblxyXG4gICAgICAgIC8qKiBUaGUgVVJMIGFzIHJlc29sdmVkIGJ5IHRoZSBjb25zdHJ1Y3Rvci4gVGhpcyBpcyBhbHdheXMgYW4gYWJzb2x1dGUgVVJMLiBSZWFkIG9ubHkuICovXHJcbiAgICAgICAgdGhpcy51cmwgPSB1cmw7XHJcblxyXG4gICAgICAgIC8qKiBUaGUgbnVtYmVyIG9mIGF0dGVtcHRlZCByZWNvbm5lY3RzIHNpbmNlIHN0YXJ0aW5nLCBvciB0aGUgbGFzdCBzdWNjZXNzZnVsIGNvbm5lY3Rpb24uIFJlYWQgb25seS4gKi9cclxuICAgICAgICB0aGlzLnJlY29ubmVjdEF0dGVtcHRzID0gMDtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIGNvbm5lY3Rpb24uXHJcbiAgICAgICAgICogQ2FuIGJlIG9uZSBvZjogV2ViU29ja2V0LkNPTk5FQ1RJTkcsIFdlYlNvY2tldC5PUEVOLCBXZWJTb2NrZXQuQ0xPU0lORywgV2ViU29ja2V0LkNMT1NFRFxyXG4gICAgICAgICAqIFJlYWQgb25seS5cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuQ09OTkVDVElORztcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQSBzdHJpbmcgaW5kaWNhdGluZyB0aGUgbmFtZSBvZiB0aGUgc3ViLXByb3RvY29sIHRoZSBzZXJ2ZXIgc2VsZWN0ZWQ7IHRoaXMgd2lsbCBiZSBvbmUgb2ZcclxuICAgICAgICAgKiB0aGUgc3RyaW5ncyBzcGVjaWZpZWQgaW4gdGhlIHByb3RvY29scyBwYXJhbWV0ZXIgd2hlbiBjcmVhdGluZyB0aGUgV2ViU29ja2V0IG9iamVjdC5cclxuICAgICAgICAgKiBSZWFkIG9ubHkuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5wcm90b2NvbCA9IG51bGw7XHJcblxyXG4gICAgICAgIC8vIFByaXZhdGUgc3RhdGUgdmFyaWFibGVzXHJcblxyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB2YXIgd3M7XHJcbiAgICAgICAgdmFyIGZvcmNlZENsb3NlID0gZmFsc2U7XHJcbiAgICAgICAgdmFyIHRpbWVkT3V0ID0gZmFsc2U7XHJcbiAgICAgICAgdmFyIHQgPSBudWxsO1xyXG4gICAgICAgIHZhciBldmVudFRhcmdldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG5cclxuICAgICAgICAvLyBXaXJlIHVwIFwib24qXCIgcHJvcGVydGllcyBhcyBldmVudCBoYW5kbGVyc1xyXG5cclxuICAgICAgICBldmVudFRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdvcGVuJywgICAgICAgZnVuY3Rpb24oZXZlbnQpIHsgc2VsZi5vbm9wZW4oZXZlbnQpOyB9KTtcclxuICAgICAgICBldmVudFRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsICAgICAgZnVuY3Rpb24oZXZlbnQpIHsgc2VsZi5vbmNsb3NlKGV2ZW50KTsgfSk7XHJcbiAgICAgICAgZXZlbnRUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignY29ubmVjdGluZycsIGZ1bmN0aW9uKGV2ZW50KSB7IHNlbGYub25jb25uZWN0aW5nKGV2ZW50KTsgfSk7XHJcbiAgICAgICAgZXZlbnRUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsICAgIGZ1bmN0aW9uKGV2ZW50KSB7IHNlbGYub25tZXNzYWdlKGV2ZW50KTsgfSk7XHJcbiAgICAgICAgZXZlbnRUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCAgICAgIGZ1bmN0aW9uKGV2ZW50KSB7IHNlbGYub25lcnJvcihldmVudCk7IH0pO1xyXG5cclxuICAgICAgICAvLyBFeHBvc2UgdGhlIEFQSSByZXF1aXJlZCBieSBFdmVudFRhcmdldFxyXG5cclxuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIgPSBldmVudFRhcmdldC5hZGRFdmVudExpc3RlbmVyLmJpbmQoZXZlbnRUYXJnZXQpO1xyXG4gICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGV2ZW50VGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIuYmluZChldmVudFRhcmdldCk7XHJcbiAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50ID0gZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudC5iaW5kKGV2ZW50VGFyZ2V0KTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVGhpcyBmdW5jdGlvbiBnZW5lcmF0ZXMgYW4gZXZlbnQgdGhhdCBpcyBjb21wYXRpYmxlIHdpdGggc3RhbmRhcmRcclxuICAgICAgICAgKiBjb21wbGlhbnQgYnJvd3NlcnMgYW5kIElFOSAtIElFMTFcclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIFRoaXMgd2lsbCBwcmV2ZW50IHRoZSBlcnJvcjpcclxuICAgICAgICAgKiBPYmplY3QgZG9lc24ndCBzdXBwb3J0IHRoaXMgYWN0aW9uXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE5MzQ1MzkyL3doeS1hcmVudC1teS1wYXJhbWV0ZXJzLWdldHRpbmctcGFzc2VkLXRocm91Z2gtdG8tYS1kaXNwYXRjaGVkLWV2ZW50LzE5MzQ1NTYzIzE5MzQ1NTYzXHJcbiAgICAgICAgICogQHBhcmFtIHMgU3RyaW5nIFRoZSBuYW1lIHRoYXQgdGhlIGV2ZW50IHNob3VsZCB1c2VcclxuICAgICAgICAgKiBAcGFyYW0gYXJncyBPYmplY3QgYW4gb3B0aW9uYWwgb2JqZWN0IHRoYXQgdGhlIGV2ZW50IHdpbGwgdXNlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgZnVuY3Rpb24gZ2VuZXJhdGVFdmVudChzLCBhcmdzKSB7XHJcbiAgICAgICAgXHR2YXIgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJDdXN0b21FdmVudFwiKTtcclxuICAgICAgICBcdGV2dC5pbml0Q3VzdG9tRXZlbnQocywgZmFsc2UsIGZhbHNlLCBhcmdzKTtcclxuICAgICAgICBcdHJldHVybiBldnQ7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5vcGVuID0gZnVuY3Rpb24gKHJlY29ubmVjdEF0dGVtcHQpIHtcclxuICAgICAgICAgICAgd3MgPSBuZXcgV2ViU29ja2V0KHNlbGYudXJsLCBwcm90b2NvbHMgfHwgW10pO1xyXG4gICAgICAgICAgICB3cy5iaW5hcnlUeXBlID0gdGhpcy5iaW5hcnlUeXBlO1xyXG5cclxuICAgICAgICAgICAgaWYgKHJlY29ubmVjdEF0dGVtcHQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1heFJlY29ubmVjdEF0dGVtcHRzICYmIHRoaXMucmVjb25uZWN0QXR0ZW1wdHMgPiB0aGlzLm1heFJlY29ubmVjdEF0dGVtcHRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudChnZW5lcmF0ZUV2ZW50KCdjb25uZWN0aW5nJykpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWNvbm5lY3RBdHRlbXB0cyA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChzZWxmLmRlYnVnIHx8IFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1Z0FsbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ2F0dGVtcHQtY29ubmVjdCcsIHNlbGYudXJsKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIGxvY2FsV3MgPSB3cztcclxuICAgICAgICAgICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuZGVidWcgfHwgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ2Nvbm5lY3Rpb24tdGltZW91dCcsIHNlbGYudXJsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRpbWVkT3V0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGxvY2FsV3MuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgIHRpbWVkT3V0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH0sIHNlbGYudGltZW91dEludGVydmFsKTtcclxuXHJcbiAgICAgICAgICAgIHdzLm9ub3BlbiA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnb25vcGVuJywgc2VsZi51cmwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc2VsZi5wcm90b2NvbCA9IHdzLnByb3RvY29sO1xyXG4gICAgICAgICAgICAgICAgc2VsZi5yZWFkeVN0YXRlID0gV2ViU29ja2V0Lk9QRU47XHJcbiAgICAgICAgICAgICAgICBzZWxmLnJlY29ubmVjdEF0dGVtcHRzID0gMDtcclxuICAgICAgICAgICAgICAgIHZhciBlID0gZ2VuZXJhdGVFdmVudCgnb3BlbicpO1xyXG4gICAgICAgICAgICAgICAgZS5pc1JlY29ubmVjdCA9IHJlY29ubmVjdEF0dGVtcHQ7XHJcbiAgICAgICAgICAgICAgICByZWNvbm5lY3RBdHRlbXB0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50KGUpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgd3Mub25jbG9zZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XHJcbiAgICAgICAgICAgICAgICB3cyA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICBpZiAoZm9yY2VkQ2xvc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuQ0xPU0VEO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQoZ2VuZXJhdGVFdmVudCgnY2xvc2UnKSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYucmVhZHlTdGF0ZSA9IFdlYlNvY2tldC5DT05ORUNUSU5HO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBlID0gZ2VuZXJhdGVFdmVudCgnY29ubmVjdGluZycpO1xyXG4gICAgICAgICAgICAgICAgICAgIGUuY29kZSA9IGV2ZW50LmNvZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5yZWFzb24gPSBldmVudC5yZWFzb247XHJcbiAgICAgICAgICAgICAgICAgICAgZS53YXNDbGVhbiA9IGV2ZW50Lndhc0NsZWFuO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQoZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvbm5lY3RBdHRlbXB0ICYmICF0aW1lZE91dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1JlY29ubmVjdGluZ1dlYlNvY2tldCcsICdvbmNsb3NlJywgc2VsZi51cmwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQoZ2VuZXJhdGVFdmVudCgnY2xvc2UnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgdGltZW91dCA9IHNlbGYucmVjb25uZWN0SW50ZXJ2YWwgKiBNYXRoLnBvdyhzZWxmLnJlY29ubmVjdERlY2F5LCBzZWxmLnJlY29ubmVjdEF0dGVtcHRzKTtcclxuICAgICAgICAgICAgICAgICAgICB0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yZWNvbm5lY3RBdHRlbXB0cysrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLm9wZW4odHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgdGltZW91dCA+IHNlbGYubWF4UmVjb25uZWN0SW50ZXJ2YWwgPyBzZWxmLm1heFJlY29ubmVjdEludGVydmFsIDogdGltZW91dCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHdzLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnb25tZXNzYWdlJywgc2VsZi51cmwsIGV2ZW50LmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdmFyIGUgPSBnZW5lcmF0ZUV2ZW50KCdtZXNzYWdlJyk7XHJcbiAgICAgICAgICAgICAgICBlLmRhdGEgPSBldmVudC5kYXRhO1xyXG4gICAgICAgICAgICAgICAgZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudChlKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgd3Mub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnb25lcnJvcicsIHNlbGYudXJsLCBldmVudCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50KGdlbmVyYXRlRXZlbnQoJ2Vycm9yJykpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gV2hldGhlciBvciBub3QgdG8gY3JlYXRlIGEgd2Vic29ja2V0IHVwb24gaW5zdGFudGlhdGlvblxyXG4gICAgICAgIGlmICh0aGlzLmF1dG9tYXRpY09wZW4gPT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICB0aGlzLm9wZW4oZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVHJhbnNtaXRzIGRhdGEgdG8gdGhlIHNlcnZlciBvdmVyIHRoZSBXZWJTb2NrZXQgY29ubmVjdGlvbi5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSBkYXRhIGEgdGV4dCBzdHJpbmcsIEFycmF5QnVmZmVyIG9yIEJsb2IgdG8gc2VuZCB0byB0aGUgc2VydmVyLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuc2VuZCA9IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgaWYgKHdzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnc2VuZCcsIHNlbGYudXJsLCBkYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB3cy5zZW5kKGRhdGEpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgJ0lOVkFMSURfU1RBVEVfRVJSIDogUGF1c2luZyB0byByZWNvbm5lY3Qgd2Vic29ja2V0JztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENsb3NlcyB0aGUgV2ViU29ja2V0IGNvbm5lY3Rpb24gb3IgY29ubmVjdGlvbiBhdHRlbXB0LCBpZiBhbnkuXHJcbiAgICAgICAgICogSWYgdGhlIGNvbm5lY3Rpb24gaXMgYWxyZWFkeSBDTE9TRUQsIHRoaXMgbWV0aG9kIGRvZXMgbm90aGluZy5cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oY29kZSwgcmVhc29uKSB7XHJcbiAgICAgICAgICAgIC8vIERlZmF1bHQgQ0xPU0VfTk9STUFMIGNvZGVcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb2RlID09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgICAgICAgICBjb2RlID0gMTAwMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3JjZWRDbG9zZSA9IHRydWU7XHJcbiAgICAgICAgICAgIGlmICh3cykge1xyXG4gICAgICAgICAgICAgICAgd3MuY2xvc2UoY29kZSwgcmVhc29uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodCkge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHQpO1xyXG4gICAgICAgICAgICAgICAgdCA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBBZGRpdGlvbmFsIHB1YmxpYyBBUEkgbWV0aG9kIHRvIHJlZnJlc2ggdGhlIGNvbm5lY3Rpb24gaWYgc3RpbGwgb3BlbiAoY2xvc2UsIHJlLW9wZW4pLlxyXG4gICAgICAgICAqIEZvciBleGFtcGxlLCBpZiB0aGUgYXBwIHN1c3BlY3RzIGJhZCBkYXRhIC8gbWlzc2VkIGhlYXJ0IGJlYXRzLCBpdCBjYW4gdHJ5IHRvIHJlZnJlc2guXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGlmICh3cykge1xyXG4gICAgICAgICAgICAgICAgd3MuY2xvc2UoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBbiBldmVudCBsaXN0ZW5lciB0byBiZSBjYWxsZWQgd2hlbiB0aGUgV2ViU29ja2V0IGNvbm5lY3Rpb24ncyByZWFkeVN0YXRlIGNoYW5nZXMgdG8gT1BFTjtcclxuICAgICAqIHRoaXMgaW5kaWNhdGVzIHRoYXQgdGhlIGNvbm5lY3Rpb24gaXMgcmVhZHkgdG8gc2VuZCBhbmQgcmVjZWl2ZSBkYXRhLlxyXG4gICAgICovXHJcbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQucHJvdG90eXBlLm9ub3BlbiA9IGZ1bmN0aW9uKGV2ZW50KSB7fTtcclxuICAgIC8qKiBBbiBldmVudCBsaXN0ZW5lciB0byBiZSBjYWxsZWQgd2hlbiB0aGUgV2ViU29ja2V0IGNvbm5lY3Rpb24ncyByZWFkeVN0YXRlIGNoYW5nZXMgdG8gQ0xPU0VELiAqL1xyXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LnByb3RvdHlwZS5vbmNsb3NlID0gZnVuY3Rpb24oZXZlbnQpIHt9O1xyXG4gICAgLyoqIEFuIGV2ZW50IGxpc3RlbmVyIHRvIGJlIGNhbGxlZCB3aGVuIGEgY29ubmVjdGlvbiBiZWdpbnMgYmVpbmcgYXR0ZW1wdGVkLiAqL1xyXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LnByb3RvdHlwZS5vbmNvbm5lY3RpbmcgPSBmdW5jdGlvbihldmVudCkge307XHJcbiAgICAvKiogQW4gZXZlbnQgbGlzdGVuZXIgdG8gYmUgY2FsbGVkIHdoZW4gYSBtZXNzYWdlIGlzIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlci4gKi9cclxuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5wcm90b3R5cGUub25tZXNzYWdlID0gZnVuY3Rpb24oZXZlbnQpIHt9O1xyXG4gICAgLyoqIEFuIGV2ZW50IGxpc3RlbmVyIHRvIGJlIGNhbGxlZCB3aGVuIGFuIGVycm9yIG9jY3Vycy4gKi9cclxuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5wcm90b3R5cGUub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7fTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgYWxsIGluc3RhbmNlcyBvZiBSZWNvbm5lY3RpbmdXZWJTb2NrZXQgc2hvdWxkIGxvZyBkZWJ1ZyBtZXNzYWdlcy5cclxuICAgICAqIFNldHRpbmcgdGhpcyB0byB0cnVlIGlzIHRoZSBlcXVpdmFsZW50IG9mIHNldHRpbmcgYWxsIGluc3RhbmNlcyBvZiBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWcgdG8gdHJ1ZS5cclxuICAgICAqL1xyXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsID0gZmFsc2U7XHJcblxyXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LkNPTk5FQ1RJTkcgPSBXZWJTb2NrZXQuQ09OTkVDVElORztcclxuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5PUEVOID0gV2ViU29ja2V0Lk9QRU47XHJcbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuQ0xPU0lORyA9IFdlYlNvY2tldC5DTE9TSU5HO1xyXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LkNMT1NFRCA9IFdlYlNvY2tldC5DTE9TRUQ7XHJcblxyXG4gICAgcmV0dXJuIFJlY29ubmVjdGluZ1dlYlNvY2tldDtcclxufSk7XHJcbiIsIiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
