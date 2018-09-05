"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
} : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

/**
 * Created by necklace on 17-5-3.
 */
//importScripts('require.js');

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
        this.post('error', title, msg);
    },
    log: function log(title, msg) {
        this.post('log', title, msg);
    },
    msg: function msg(m) {
        for (var p in ports) {
            p.postMessage(m);
        }
    },
    post: function post(tag, title, msg) {
        for (var p in ports) {
            p.postMessage({tag: tag, title: title, msg: msg});
        }
    },
    postTarget: function postTarget(port, obj) {
        port.postMessage(obj);
    }
};

function bo(obj) {
    for (var i = 0; i < ports.length; i++) {
        ports[i].postMessage(obj);
    }
}

function initWS(url) {
    var timeout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 5000;
    arguments[2].postMessage('eeeeeee');

    if (socket === null) {
        try {
            socket = new WebSocket(url);
            arguments[2].postMessage('ffffffffffff1');
        } catch (error) {
            arguments[2].postMessage('f2');
            wconsole.error("invalid websocket URL:", error);
            socket = new WebSocket("wss://127.0.0.1:8080");
        }
        socket.timeoutInterval = timeout;
        socket.onopen = function () {
            bo({event: 'onopen'});
        };
        socket.onerror = function (error) {
            bo({event: 'onerror', data: error});
        };
        socket.onmessage = function (message) {
            bo({event: 'onmessage', data: message});
        };
        socket.onclose = function () {
            bo({event: 'onclose'});
        };
    }
}

function procMsg(obj, port) {
    port.postMessage('bbbbbbbbbbbbb')
    if ((typeof obj === "undefined" ? "undefined" : _typeof(obj)) === "object") {
        if (!!obj.method) {
            switch (obj.method) {
                case 'send':
                    if (!!socket) {
                        socket.send(obj.pars[0]);
                    }
                    break;
                case 'close':
                    if (!!socket) {
                        socket.close();
                    }
                    break;
                case 'init':
                    port.postMessage('cccccccccccccc')
                    var s = obj.pars[0];
                    ws_timeout = obj.pars[1];
                    if (s !== server) {
                        port.postMessage('dddddddddd')
                        server = s;
                        initWS(server, ws_timeout, port);
                    }
                    break;
                case 'reset':
                    socket.close();
                    socket = null;
                    initWS(server, ws_timeout);
                    break;
                default:
                    wconsole.postTarget(port, {tag: 'error', title: 'worker', msg: 'Unsupported method'});
                    break;
            }
        }
    }
}

onconnect = function onconnect(e) {
    var port = e.ports[0];
    ports.push(port);
    port.addEventListener('message', function (e) {
        port.postMessage("aaaaaaaaaaaaaaaaaaaaa");
        procMsg(e.data, port);
    });
    port.start();
};