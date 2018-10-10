import ds9 from '../../ds9RemoteApi';

const RXREQTYPE_RESERVE = 1;
const RXREQTYPE_REVOKE = 2;
const RXREQTYPE_RETURN = 3;

const dispatchRxqueue = async (leCtx) => {
    let rxReqs = await leCtx.rcon.send('/dequeue_rx_queue');
    let rxReqsParsed = JSON.parse(rxReqs);

    if (rxReqsParsed instanceof Array) {
        for (var rxReq of rxReqsParsed) {
            var reqId = rxReq.id;
            var reqType = rxReq.type;
            var items = rxReq.items;
            
            switch (reqType) {
                case RXREQTYPE_RESERVE:
                    var commitItems = {};
                    var itemNames = Object.keys(items);
                    for (var itemName of itemNames) {
                        if (items[itemName] > 0)
                            commitItems[itemName] = items[itemName] * -1; // convert to negative number (for item request)
                        else
                            delete items[itemName]; // delete invalid requests
                    }
                    if (Object.keys(items).length > 0) {
                        let result = await ds9.inventory(leCtx.config, commitItems);
                        
                        if (result.error) {
                            console.log('[-] ds9 Api error (res): ' + result.error);
                        } else {
                            if (result.response) {
                                switch (result.response.statusCode) {
                                    case 200:
                                        await leCtx.rcon.send('/confirm_rx_reservation ' + JSON.stringify(rxReq));
                                        break;
                                    case 404:
                                    default:
                                }
                            } else {
                                console.log('[-] Unexpected ds9 Api error: No resp');
                            }
                        }
                    }
                        
                    break;
                case RXREQTYPE_REVOKE:
                    // current policy: ignore
                    break;
                case RXREQTYPE_RETURN:
                    var itemNames = Object.keys(items);
                    for (var itemName of itemNames) {
                        if (items[itemName] <= 0)
                            delete items[itemName];
                    }
                    if (Object.keys(items).length > 0) {
                        let result = await ds9.inventory(leCtx.config, items);

                        if (result.error) {
                            console.log('[-] ds9 Api error (rxq ret): ' + result.error);
                        } else {
                            if (result.response) {
                                if (result.response.statusCode != 200) {
                                }
                            } else {
                                console.log('[-] Unexpected ds9 Api error: No resp');
                            }
                        }
                    }
                    break;
            }
        }
    }
};

const dispatchTxqueue = async (leCtx) => {
    let txReqs = await leCtx.rcon.send('/dequeue_tx_queue');
    let txReqsParsed = JSON.parse(txReqs);

    if (txReqsParsed instanceof Array) {
        for (var txReq of txReqsParsed) {
            var reqId = txReq.id;
            var items = txReq.items;
            
            var itemNames = Object.keys(items);
            for (var itemName of itemNames) {
                if (items[itemName] <= 0)
                    delete items[itemName];
            }
            if (Object.keys(items).length > 0) {
                let result = await ds9.inventory(leCtx.config, items);

                if (result.error) {
                    console.log('[-] ds9 Api error (txq ret): ' + result.error);
                } else {
                    if (result.response) {
                        if (result.response.statusCode != 200) {
                        }
                    } else {
                        console.log('[-] Unexpected ds9 Api error: No resp');
                    }
                }
            }
        }
    }
};

export default {
    dispatchRxqueue,
    dispatchTxqueue
};
