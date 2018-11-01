import Apis from "./ApiInstances";
import ChainWebSocket from "./ChainWebSocket";

class Manager {
    constructor({url, urls, autoFallback, closeCb, optionalApis, urlChangeCallback}) {
        this.url = url;
        this.urls = urls.filter(a => a !== url);
        this.autoFallback = autoFallback;
        this.closeCb = closeCb;
        this.optionalApis = optionalApis || {};
        this.isConnected = false;
        this.urlChangeCallback = urlChangeCallback;
    }

    setCloseCb(cb) {
        this.closeCb = cb;
    }

    static close() {
        return Apis.close();
    }

    logFailure(method, url, err) {
        let message = err && err.message ? err.message : "";
        console.error(method, "Failed to connect to " + url + (message ? (" Error: " + JSON.stringify(message)) : ""));
    }

    _onClose() {
        this.isConnected = false;
        if (this.closeCb) {
            this.closeCb();
            this.setCloseCb(null);
        }
        if (this.autoFallback) {
            this.connectWithFallback()
        };
    }

    connect(connect = true, url = this.url) {
        return new Promise((resolve, reject) => {
            Apis.instance(url, connect, undefined, this.optionalApis, this._onClose.bind(this)).init_promise
            .then((res) => {
                this.url = url;
                this.isConnected = true;
                resolve(res);
            }).catch((err) => {
                Apis.close().then(() => {
                    reject(err);
                });
            });
        });
    }

    connectWithFallback(connect = true, url = this.url, index = 0, resolve = null, reject = null) {
        if (reject && (index > this.urls.length)) return reject(new Error("Tried "+ (index) +" connections, none of which worked: " + JSON.stringify(this.urls.concat(this.url))));
        const fallback = (err, resolve, reject) => {
            if (this.urlChangeCallback) this.urlChangeCallback(this.urls[index]);
            return this.connectWithFallback(connect, this.urls[index], index + 1, resolve, reject);
        }
        if (resolve && reject) {
            return this.connect(connect, url)
            .then(resolve)
            .catch((err) => {
                fallback(err, resolve, reject);
            })
        } else {
            return new Promise((resolve, reject) => {
                this.connect(connect, undefined)
                .then(resolve)
                .catch((err) => {
                    fallback(err, resolve, reject);
                })
            })
        }
    }

    checkConnections(rpc_user = "", rpc_password = "", resolve, reject) {
        let connectionStartTimes = {};
        const checkFunction = (resolve, reject) => {
            let fullList = this.urls.concat(this.url);
            let connectionPromises = [];

            fullList.forEach(url => {
                /* Use default timeout and no reconnecting-websocket */
                let conn = new ChainWebSocket(url, () => {}, undefined, false);
                connectionStartTimes[url] = new Date().getTime();
                connectionPromises.push(() => {
                    return conn.login(rpc_user, rpc_password).then((data) => {
                        let result = {[url]: new Date().getTime() - connectionStartTimes[url]};
                        return conn.close().then(() => result);
                    }).catch(err => {
                        this.logFailure("checkConnections", url, err);
                        if (url === this.url) {
                            this.url = this.urls[0];
                        } else {
                            this.urls = this.urls.filter(a => a !== url);
                        }
                        return conn.close().then(() => null);
                    })
                });
            });

            Promise.all(
                connectionPromises.map(a => a())
            ).then((res) => {
                let x = res;
                let final = res
                .filter(a => !!a)
                .sort((a, b) => {
                    return Object.values(a)[0] - Object.values(b)[0];
                }).reduce((f, a) => {
                    let key = Object.keys(a)[0];
                    f[key] = a[key];
                    return f;
                }, {});

                if(__WS_DEBUG__)
                    console.log(`Checked ${res.length} connections, ${res.length - Object.keys(final).length} failed`);

                // 自动切换最快api
                this.url = Object.keys(final)[0];
                return resolve(final);
            }).catch(() => {
                return this.checkConnections(rpc_user, rpc_password, resolve, reject);
            });
        };

        if (resolve && reject) {
            checkFunction(resolve, reject);
        } else {
            return new Promise(checkFunction)
        }

    }
}

export default Manager;
