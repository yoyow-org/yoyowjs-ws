"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * Created by necklace on 17-5-3.
 */
importScripts('require.js');

var WebSocketClient = void 0;
var ports = []; //保存所有连接的端口
var socket = null; //worker全局socket对象
var server = "ws://localhost:8090";
var ws_timeout = 5000;

WebSocketClient = WebSocket;
/*
if (!!WebSocketClient === false) {
    if (typeof WebSocket === "undefined" && !process.env.browser) {
        WebSocketClient = require("ws");
    } else if (typeof WebSocket !== "undefined" && typeof document !== "undefined") {
        WebSocketClient = require("ReconnectingWebSocket");
    } else {
        WebSocketClient = WebSocket;
    }
}
*/

var wconsole = {
    error: function error(title, msg) {
        wconsole.post('error', title, msg);
    },
    log: function log(title, msg) {
        wconsole.post('log', title, msg);
    },
    msg: function msg(m) {
        for (var p in ports) {
            p.postMessage(m);
        }
    },
    post: function post(tag, title, msg) {
        for (var p in ports) {
            p.postMessage({ tag: tag, title: title, msg: msg });
        }
    },
    postTarget: function postTarget(port, obj) {
        port.postMessage(obj);
    }
};
//broadcast
function broadcast(obj) {
    for (var i = 0; i < ports.length; i++) {
        ports[i].postMessage(obj);
    }
}

function initWS(url) {
    var timeout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 5000;

    if (socket === null) {
        try {
            socket = new WebSocketClient(url);
        } catch (error) {
            wconsole.error("invalid websocket URL:", error);
            socket = new WebSocketClient("wss://127.0.0.1:8080");
        }
        socket.timeoutInterval = timeout;
        socket.onopen = function () {
            broadcast({ event: 'onopen' });
        };
        socket.onerror = function (error) {
            broadcast({ event: 'onerror', data: error });
        };
        socket.onmessage = function (message) {
            broadcast({ event: 'onmessage', data: message.data });
        };
        socket.onclose = function () {
            broadcast({ event: 'onclose' });
        };
    }
}

function procMsg(obj, port) {
    if ((typeof obj === "undefined" ? "undefined" : _typeof(obj)) === "object") {
        if (!!obj.method) {
            switch (obj.method) {
                case 'send':
                    if (!!socket) {
                        port.postMessage(obj.pars[0])
                        socket.send(obj.pars[0]);
                    }
                    break;
                case 'close':
                    if (!!socket) {
                        socket.close();
                    }
                    break;
                case 'init':
                    var s = obj.pars[0];
                    ws_timeout = obj.pars[1];
                    if (s !== server) {
                        server = s;
                        initWS(server, ws_timeout);
                    }
                    break;
                case 'reset':
                    socket.close();
                    socket = null;
                    initWS(server, ws_timeout);
                    break;
                default:
                    wconsole.postTarget(port, { tag: 'error', title: 'worker', msg: 'Unsupported method' });
                    break;
            }
        }
    }
}

onconnect = function onconnect(e) {
    var port = e.ports[0];
    ports.push(port);
    port.addEventListener('message', function (e) {
        procMsg(e.data, port);
    });
    port.start();
    port.postMessage({event:"onconnect",data:ports.length});
};