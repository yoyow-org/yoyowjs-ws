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