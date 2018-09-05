function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

import SharedWebSocket from "./SharedWebSocket";

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
                this.ws = new SharedWebSocket(ws_server, 5000);
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
            _this.ws.onopen = function () {
                if (__WS_DEBUG__) console.log("onopen...");
                if (_this.statusCb) _this.statusCb("open");
                resolve();
            };
            _this.ws.onerror = function (error) {
                if (__WS_DEBUG__) console.log("error...");
                _this.__clearCheckSocket();
                if (_this.statusCb) _this.statusCb("error");
                if (_this.current_reject) {
                    _this.current_reject(error);
                }
            };
            _this.ws.onmessage = function (message) {
                var parseMsg = void 0;
                try {
                    parseMsg = JSON.parse(message.data);
                } catch (error) {
                    parseMsg = JSON.parse(message);
                } finally {
                    _this.listener(parseMsg);
                }
            };
            _this.ws.onclose = function (event) {
                if (__WS_DEBUG__) console.log("onclose...", event);
                _this.__clearCheckSocket();
                if (_this.statusCb) _this.statusCb("closed");
                if (_this.current_reject) {
                    _this.current_reject(event);
                }
            };
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

export default ChainWebSocket;