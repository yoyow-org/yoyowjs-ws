import SharedWebSocket from "./SharedWebSocket";

let WebSocketClient;
if (typeof WebSocket === "undefined" && !process.env.browser) {
    WebSocketClient = require("ws");
} else {
    WebSocketClient = WebSocket;
}

function getWebSocketClient(autoReconnect){
    if( !autoReconnect &&  (typeof(WebSocket) !== "undefined" && typeof document !== "undefined") ) {
        return WebSocket;
    }
    return WebSocketClient;
}

let keep_alive_interval = 5000;
let max_send_life = 5;
let max_recv_life = max_send_life * 2;

class ChainWebSocket {

    constructor(ws_server, statusCb, connectTimeout = 5000, autoReconnect=true, keepAliveCb=null) {
        this.url = ws_server;
        this.statusCb = statusCb;
        this.connectionTimeout = setTimeout(() => {
            if (this.current_reject) {
                var reject = this.current_reject;
                this.current_reject = null;
                this.close();
                reject(new Error("Connection attempt timed out after " + connectTimeout / 1000 + "s"));
            }
        }, connectTimeout);

        this.current_reject = null;
        this.on_reconnect = null;
        this.closed = false;
        this.send_life = max_send_life;
        this.recv_life = max_recv_life;
        this.keepAliveCb = keepAliveCb;
        this.connect_promise = new Promise((resolve, reject) => {
            this.current_reject = reject;
            let WsClient = getWebSocketClient(autoReconnect);
            try {
                this.ws = new WsClient(ws_server);
            } catch (error) {
                this.ws = {readyState: 3, close: () => {}}; // DISCONNECTED
                reject(new Error("Invalid url", ws_server, " closed"))
            }

            this.ws.onopen = () => {
                clearTimeout(this.connectionTimeout);
                if(this.statusCb) this.statusCb("open");
                if(this.on_reconnect) this.on_reconnect();
                this.keepalive_timer = setInterval(()=>{

                    this.recv_life --;
                    if( this.recv_life == 0){
                        console.error(this.url + ' connection is dead, terminating ws');
                        this.close();
                        // clearInterval(this.keepalive_timer);
                        // this.keepalive_timer = undefined;
                        return;
                    }
                    this.send_life --;
                    if( this.send_life == 0) {
                        // this.ws.ping('', false, true);
                        if ( this.keepAliveCb ){
                            this.keepAliveCb(this.closed);
                        }
                        this.send_life = max_send_life;
                    }
                }, 5000);
                this.current_reject = null;
                resolve();
            }
            this.ws.onerror = (error) => {
                if( this.keepalive_timer ){
                    clearInterval(this.keepalive_timer);
                    this.keepalive_timer = undefined;
                }
                clearTimeout(this.connectionTimeout);
                if(this.statusCb) this.statusCb("error");

                if (this.current_reject) {
                    this.current_reject(error);
                }
            };
            this.ws.onmessage = (message) => {
                this.recv_life = max_recv_life;
                this.listener(JSON.parse(message.data));
            }
            this.ws.onclose = () => {
                this.closed = true;
                if( this.keepalive_timer ){
                    clearInterval(this.keepalive_timer);
                    this.keepalive_timer = undefined;
                }
                var err = new Error('connection closed');
                for(var cbId = this.responseCbId + 1; cbId <= this.cbId; cbId +=1 ){
                    this.cbs[cbId].reject(err);
                }
                if(this.statusCb) this.statusCb("closed");
                if (this._closeCb) this._closeCb();
                if (this.on_close) this.on_close();
            };
        });
        this.cbId = 0;
        this.responseCbId = 0;
        this.cbs = {};
        this.subs = {};
        this.unsub = {};
    }

    call(params) {
        if( this.ws.readyState !== 1){
            return Promise.reject(new Error('websocket state error:' + this.ws.readyState));
        }
        let method = params[1];
        if(__WS_DEBUG__)
            console.log("[ChainWebSocket] >---- call ----->  \"id\":" + (this.cbId+1), JSON.stringify(params));

        this.cbId += 1;

        if (method === "set_subscribe_callback" || method === "subscribe_to_market" ||
            method === "broadcast_transaction_with_callback" || method === "set_pending_transaction_callback"
            )
        {
            // Store callback in subs map
            this.subs[this.cbId] = {
                callback: params[2][0]
            };

            // Replace callback with the callback id
            params[2][0] = this.cbId;
        }

        if( method === "unsubscribe_from_market" || method === "unsubscribe_from_accounts") {
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
        this.send_life = max_send_life;

        return new Promise((resolve, reject) => {
            this.cbs[this.cbId] = {
                time: new Date(),
                resolve: resolve,
                reject: reject
            };
            this.ws.send(JSON.stringify(request));
        });

    }

    listener(response) {
        if(__WS_DEBUG__)
            console.log("[ChainWebSocket] <---- reply ----<", JSON.stringify(response));

        let sub = false,
            callback = null;

        if (response.method === "notice") {
            sub = true;
            response.id = response.params[0];
        }

        if (!sub) {
            callback = this.cbs[response.id];
            this.responseCbId = response.id;
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
            console.log("Warning: unknown websocket response: ", response);
        }
    }

    login(user, password) {
        return this.connect_promise.then(() => {
            return this.call([1, "login", [user, password]]);
        });
    }

    close() {
        return new Promise((res) => {
            clearInterval(this.keepalive_timer);
            this.keepalive_timer = undefined;
            this._closeCb = () => {
                res();
                this._closeCb = null;
            };
            if (!this.ws) {
                console.log("Websocket already cleared", this);
                return res();
            }
            if( this.ws.terminate ) {
                this.ws.terminate();
            }
            else{
                this.ws.close();
            }
            if (this.ws.readyState === 3) res();
        })
    }
}

export default ChainWebSocket;