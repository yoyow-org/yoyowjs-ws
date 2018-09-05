import assert from "assert";
import {Apis} from "../lib";

var coreAsset;

describe("Connection", () => {

    afterEach(function() {
        Apis.close();
    });

    it("Connect to YOYOW", function() {
        return new Promise( function(resolve) {
            Apis.instance("ws://demo.yoyow.org:8191", true).init_promise.then(function (result) {
                coreAsset = result[0].network.core_asset;
                assert(coreAsset === "YOYO");
                resolve();
            });
        });
    });
});

describe("Api", () => {

    //let cs = "wss://bitshares.openledger.info/ws";
    let cs="ws://demo.yoyow.org:8191";


    // after(function() {
    //     ChainConfig.reset();
    // });

    describe("Subscriptions", function() {

        beforeEach(function() {
            return Apis.instance(cs, true).init_promise.then(function (result) {
                coreAsset = result[0].network.core_asset;
            });
        });

        afterEach(function() {
            Apis.close();
        });

        it("Set subscribe callback", function() {
            return new Promise( function(resolve) {
                Apis.instance().db_api().exec( "set_subscribe_callback", [ callback, true ] ).then(function(sub) {
                    if (sub === null) {
                        resolve();
                    } else {
                        reject(new Error("Expected sub to equal null"));
                    }
                })

                function callback(obj) {
                    console.log("callback obj:", obj);
                    resolve()
                }
            })
        });
    })

    describe("Api methods", function() {

        // Connect once for all tests
        before(function() {
            return Apis.instance(cs, true).init_promise.then(function (result) {
                coreAsset = result[0].network.core_asset;
            });
        });

        it("Get block", function() {
            return new Promise( function(resolve, reject) {
                Apis.instance().db_api().exec( "get_block", [1]).then(function(block) {
                    if (block.previous === "0000000000000000000000000000000000000000") {
                        resolve();
                    } else {
                        reject(new Error("Expected block with previous value of 0000000000000000000000000000000000000000"));
                    }
                })
            })
        });

        it ("Get full accounts", function() {
            let uid=25638;
            return new Promise( function(resolve, reject) {
                Apis.instance().db_api().exec( "get_full_accounts_by_uid", [[uid],{fetch_account_object:true}]).then(function(accounts) {
                    let byUid = accounts[0][1];
                    console.log(byUid)
                    if (byUid.account.uid === uid && byUid.account.name === "init0") {
                        resolve();
                    } else {
                        reject(new Error(`Expected objects with id ${uid} and name committee-account`));
                    }
                })
            })
        });
    });
})
