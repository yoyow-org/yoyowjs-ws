function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

import Apis from "./ApiInstances";
import ChainWebSocket from "./ChainWebSocket";

var Manager = function () {
    function Manager(_ref) {
        var url = _ref.url,
            urls = _ref.urls;

        _classCallCheck(this, Manager);

        this.url = url;
        this.urls = urls.filter(function (a) {
            return a !== url;
        });
    }

    Manager.prototype.logFailure = function logFailure(url) {
        console.error("Unable to connect to", url + ", skipping to next full node API server");
    };

    Manager.prototype.connect = function connect() {
        var _connect = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

        var url = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.url;

        return new Promise(function (resolve, reject) {
            Apis.instance(url, _connect).init_promise.then(resolve).catch(function () {
                Apis.instance().close();
                reject();
            });
        });
    };

    Manager.prototype.connectWithFallback = function connectWithFallback() {
        var connect = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
        var url = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.url;
        var index = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

        var _this = this;

        var resolve = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
        var reject = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;

        if (reject && index > this.urls.length - 1) return reject(new Error("Tried " + (index + 1) + " connections, none of which worked: " + JSON.stringify(this.urls.concat(this.url))));
        var fallback = function fallback(resolve, reject) {
            _this.logFailure(url);
            return _this.connectWithFallback(connect, _this.urls[index], index + 1, resolve, reject);
        };
        if (resolve && reject) {
            return this.connect(connect, url).then(resolve).catch(function () {
                fallback(resolve, reject);
            });
        } else {
            return new Promise(function (resolve, reject) {
                _this.connect(connect).then(resolve).catch(function () {
                    fallback(resolve, reject);
                });
            });
        }
    };

    Manager.prototype.checkConnections = function checkConnections() {
        var rpc_user = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        var rpc_password = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";

        var _this2 = this;

        var resolve = arguments[2];
        var reject = arguments[3];

        var connectionStartTimes = {};
        var checkFunction = function checkFunction(resolve, reject) {
            var fullList = _this2.urls.concat(_this2.url);
            var connectionPromises = [];

            fullList.forEach(function (url) {
                var conn = new ChainWebSocket(url, function () {});
                connectionStartTimes[url] = new Date().getTime();
                connectionPromises.push(function () {
                    return conn.login(rpc_user, rpc_password).then(function (data) {
                        var _ref2;

                        conn.close();
                        return _ref2 = {}, _ref2[url] = new Date().getTime() - connectionStartTimes[url], _ref2;
                    }).catch(function (err) {
                        if (url === _this2.url) {
                            _this2.url = _this2.urls[0];
                        } else {
                            _this2.urls = _this2.urls.filter(function (a) {
                                return a !== url;
                            });
                        }
                        conn.close();
                        return null;
                    });
                });
            });

            Promise.all(connectionPromises.map(function (a) {
                return a();
            })).then(function (res) {
                resolve(res.filter(function (a) {
                    return !!a;
                }).reduce(function (f, a) {
                    var key = Object.keys(a)[0];
                    f[key] = a[key];
                    return f;
                }, {}));
            }).catch(function () {
                return _this2.checkConnections(rpc_user, rpc_password, resolve, reject);
            });
        };

        if (resolve && reject) {
            checkFunction(resolve, reject);
        } else {
            return new Promise(checkFunction);
        }
    };

    return Manager;
}();

export default Manager;