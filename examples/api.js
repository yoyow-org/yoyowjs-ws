// Node.js example
/* running 'npm run build' is necessary before launching the examples */
var {Apis} = require("../cjs")
let wsString = "ws://47.52.155.181:8090";
let wsStringLocal = "ws://127.0.0.1:8090";

Apis.setRpcConnectionStatusCallback((msg) => {
    //open,error,closed
    console.log('Api status:', msg);
    if (msg === "closed") {
        Apis.reset(wsString);
    }
});

Apis.instance(wsString, true).init_promise.then((res) => {
    console.log("connected to:", res[0].network);

    /*
    function updateObject() {
        Apis.instance().db_api().exec("get_objects", [["2.1.0"]]).then(response => {
            console.log("get_object", response);
        });
    }

    updateObject();
    setInterval(updateObject, 3000);
    */
});
