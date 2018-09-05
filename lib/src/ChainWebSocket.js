import SharedWebSocket from "./SharedWebSocket";

let WebSocketClient;

class ChainWebSocket {

    constructor(ws_server, statusCb) {

        if (typeof WebSocket === "undefined" && !process.env.browser) {
            WebSocketClient = require("ws");
        } else if (typeof(WebSocket) !== "undefined" && typeof document !== "undefined") {
            WebSocketClient = require("ReconnectingWebSocket")
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
                let __this = this;
                if (this.ws["ping"]) {
                    this.checkSocket = setInterval(() => {
                        __this.ws.ping(0);
                    }, 2000);
                } else {
                    this.ws.timeoutInterval = 5000;
                    this.checkSocket = setInterval(() => {
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
        this.connect_promise = new Promise((resolve, reject) => {
            this.current_reject = reject;
            this.ws.onopen = () => {
                if (__WS_DEBUG__)
                    console.log("onopen...");
                if (this.statusCb) this.statusCb("open");
                resolve();
            };
            this.ws.onerror = (error) => {
                if (__WS_DEBUG__) console.log("error...");
                this.__clearCheckSocket();
                if (this.statusCb) this.statusCb("error");
                if (this.current_reject) {
                    this.current_reject(error);
                }
            };
            this.ws.onmessage = (message) => {
                let parseMsg ;
                try {
                    parseMsg = JSON.parse(message.data); 
                } catch (error) {
                    parseMsg = JSON.parse(message);
                } finally{
                    this.listener(parseMsg);
                }
            };
            this.ws.onclose = (event) => {
                if (__WS_DEBUG__) console.log("onclose...", event);
                this.__clearCheckSocket();
                if (this.statusCb) this.statusCb("closed");
                if (this.current_reject) {
                    this.current_reject(event);
                }
            };

        });
        this.cbId = 0;
        this.cbs = {};
        this.subs = {};
        this.unsub = {};
    }

    __clearCheckSocket() {
        if (this.checkSocket != null) {
            clearInterval(this.checkSocket);
            this.checkSocket = null;
        }
    }

    call(params) {
        let method = params[1];
        if (__WS_DEBUG__)
            console.log("[ChainWebSocket] >---- call ----->  \"id\":" + (this.cbId + 1), JSON.stringify(params));

        this.cbId += 1;

        if (method === "set_subscribe_callback" || method === "subscribe_to_market" ||
            method === "broadcast_transaction_with_callback" || method === "set_pending_transaction_callback"
        ) {
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

            let unSubCb = params[2].splice(0, 1)[0];

            // Find the corresponding subscription
            for (let id in this.subs) {
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
        return new Promise((resolve, reject) => {
            this.cbs[this.cbId] = {
                time: new Date(),
                resolve: resolve,
                reject: reject
            };
            /*this.ws.onerror = (error) => {
                console.log("!!! ChainWebSocket Error ", error);
                reject(error);
            };*/
            this.ws.send(JSON.stringify(request));
        });

    }

    listener(response) {
        if (__WS_DEBUG__)
            console.log("[ChainWebSocket] <---- reply ----<", JSON.stringify(response));

        let sub = false,
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
            if (__WS_DEBUG__)
                console.log("Warning: unknown websocket response: ", response);
        }
    }

    login(user, password) {
        return this.connect_promise.then(() => {
            return this.call([1, "login", [user, password]]);
        });
    }

    close() {
        this.ws.close();
    }

    reset() {
        if (this.ws.reset) this.ws.reset();
    }
}

export default ChainWebSocket;
