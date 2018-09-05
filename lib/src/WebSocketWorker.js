/**
 * Created by necklace on 17-5-3.
 */
//importScripts('require.js');

//let WebSocketClient;
let ports = [];//保存所有连接的端口
let socket = null;//worker全局socket对象
let server = "";
let ws_timeout = 5000;
let pingSocket = null;//检查socket连接（处理SharedWorker中ws不能正常收到close消息）
let close_normal = false;//是否是正常关闭

/*
if (!!WebSocketClient === false) {
    if (typeof WebSocket === "undefined" && !process.env.browser) {
        WebSocketClient = require("ws");
    } else if (typeof WebSocket !== "undefined" && typeof document !== "undefined") {
        WebSocketClient = require("ReconnectingWebSocket")
    } else {
        WebSocketClient = WebSocket;
    }
}
*/

//broadcast
function broadcast(obj) {
    for (var i = 0; i < ports.length; i++) {
        ports[i].postMessage(obj);
    }
}

let wconsole = {
    error: (title, msg) => {
        wconsole.post('error', title, msg);
    },
    log: (title, msg) => {
        wconsole.post('log', title, msg);
    },
    msg: (m) => {
        broadcast(m);
    },
    post: (tag, title, msg) => {
        broadcast({tag: tag, title: title, msg: msg})
    },
    postTarget: (port, obj) => {
        port.postMessage(obj);
    }
};


function initWS(url, timeout = 5000) {
    close_normal = false;
    if (socket === null) {
        try {
            socket = new WebSocket(url);
        } catch (e) {
        }
        socket.timeoutInterval = timeout;
        socket.onopen = () => {
            broadcast({event: 'onopen'});
        };
        socket.onerror = (error) => {
            broadcast({event: 'onerror', data: error});
            clearInterval(pingSocket);
        };
        socket.onmessage = (message) => {
            broadcast({event: 'onmessage', data: message.data});
        };
        socket.onclose = (event) => {
            broadcast({event: 'onclose', data: event});
            clearInterval(pingSocket);
        };
        //检查socket状态，关闭时广播onclose消息
        pingSocket = setInterval(function () {
            //wconsole.log("readyState",socket.readyState)
            if (socket.readyState == 3) {
                //CLOSE_NORMAL=1000,CLOSE_NO_STATUS=1005
                broadcast({event: 'onclose', data: {code: close_normal ? 1000 : 1005}});
                clearInterval(pingSocket);
            }
        }, 1000);
    }
}


function procMsg(obj, port) {
    if (typeof obj === "object") {
        if (!!obj.method) {
            switch (obj.method) {
                case 'send':
                    if (!!socket) {
                        socket.send(obj.pars[0]);
                    }
                    break;
                case 'close':
                    close_normal = true;
                    ports.clean();
                    if (!!socket) {
                        socket.close();
                        socket = null;
                    }
                    break;
                case 'init':
                    let s = obj.pars[0];
                    ws_timeout = obj.pars[1];
                    if (s !== server) {
                        server = s;
                        initWS(server, ws_timeout);
                    }
                    break;
                case 'reset':
                    close_normal = true;
                    socket.close();
                    socket = null;
                    initWS(server, ws_timeout);
                    break;
                case 'ping':
                    wconsole.postTarget(port, {tag: 'log', title: 'ping', msg: socket.readyState});
                    break;
                default:
                    wconsole.postTarget(port, {tag: 'error', title: 'worker', msg: 'Unsupported method'});
                    break;
            }
        }
    }
}


onconnect = function (e) {
    var port = e.ports[0];
    ports.push(port);
    port.addEventListener('message', function (e) {
        procMsg(e.data, port);
    });
    port.start();
    port.postMessage({event: "onconnect", data: ports.length});
}