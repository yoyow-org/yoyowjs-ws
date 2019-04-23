var _this = void 0;

var ecc_config = {
    address_prefix: process.env.npm_config__graphene_ecc_default_address_prefix || "YYW"
};

_this = {
    core_asset: "YOYO",
    address_prefix: "YYW",
    expire_in_secs: 15,
    expire_in_secs_proposal: 24 * 60 * 60,
    review_in_secs_committee: 24 * 60 * 60,
    networks: {
        YOYOW: {
            core_asset: "YOYO",
            address_prefix: "YYW",
            chain_id: "ae4f234c75199f67e526c9478cf499dd6e94c2b66830ee5c58d0868a3179baf6"
        },
        Test: {
            core_asset: "TEST",
            address_prefix: "YYW",
            chain_id: "70f798eec64e1aea86efa8be3466480a1db1f97215a0de0c1a7ab0e1f3fd09fb"
        }
    },

    /** Set a few properties for known chain IDs. */
    setChainId: function setChainId(chain_id) {

        var i = void 0,
            len = void 0,
            network = void 0,
            network_name = void 0,
            ref = void 0;
        ref = Object.keys(_this.networks);

        for (i = 0, len = ref.length; i < len; i++) {

            network_name = ref[i];
            network = _this.networks[network_name];

            if (network.chain_id === chain_id) {

                _this.network_name = network_name;

                if (network.address_prefix) {
                    _this.address_prefix = network.address_prefix;
                    ecc_config.address_prefix = network.address_prefix;
                }
                if (network.core_asset) {
                    _this.core_asset = network.core_asset;
                }
                console.log("chain_id:", chain_id);
                console.log("network_name:", network_name);
                return {
                    network_name: network_name,
                    network: network
                };
            }
        }

        if (!_this.network_name) {
            console.log("Unknown chain id (this may be a testnet)", chain_id);
        }
    },

    reset: function reset() {
        _this.core_asset = "YOYO";
        _this.address_prefix = "YYW";
        ecc_config.address_prefix = "YYW";
        _this.expire_in_secs = 15;
        _this.expire_in_secs_proposal = 24 * 60 * 60;

        console.log("Chain config reset");
    },

    setPrefix: function setPrefix() {
        var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "YYW";

        _this.address_prefix = prefix;
        ecc_config.address_prefix = prefix;
    }
};

export default _this;