import ds9 from '../../ds9RemoteApi';

const RXREQTYPE_RESERVE = 1;
const RXREQTYPE_REVOKE = 2;
const RXREQTYPE_RETURN = 3;

const addInventory = (dst, src) => {
    let newDst = Object.assign({}, dst);
    for (var key of Object.keys(src)) {
        if (newDst[key] != undefined) {
            newDst[key] += src[key];
            if (newDst[key] == 0)
                delete newDst[key];
        } else if(src[key] != 0)
            newDst[key] = src[key];
    }
    return newDst;
};

const mergeInventory = (dst, src) => {
    let newDst = dst;
    for (var key of Object.keys(src)) {
        if (newDst[key] != undefined) {
            newDst[key] += src[key];
            if (newDst[key] == 0)
                delete newDst[key];
        } else if(src[key] != 0)
            newDst[key] = src[key];
    }
    return newDst;
};

const dispatchRxqueue = async (leCtx) => {
    let rxReqs = await leCtx.rcon.send('/dequeue_rx_queue');
    let rxReqsParsed = JSON.parse(rxReqs);
    let db = leCtx.db.read();
    let prevFailedTx = db.defaults({ 'failed-tx-inv': {} }).get('failed-tx-inv');

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
                        let res = await ds9.inventory(leCtx.config, commitItems);
                        
                        if (!res.error && (res.response.statusCode == 200)) {
                            await leCtx.rcon.send('/confirm_rx_reservation ' + JSON.stringify(rxReq));
                        } else {
                            console.log('[-] DS9RC-RXRCKRES HTTP req failed: ' + res.error.code);
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
                        let res = await ds9.inventory(leCtx.config, items);

                        if (res.error || (res.response.statusCode != 200)) {
                            console.log('[-] DS9RC-RXRCKRET HTTP req failed: ' + res.error.code);
                            let prevFailed = prevFailedTx.value();
                            let saveInv = mergeInventory(prevFailed, items);
                            db.set('failed-tx-inv', saveInv).write();
                            console.log('[!] Last RCKRET query has been saved.');
                        }
                    }
                    break;
            }
        }
    }

    return Promise.resolve();
};

const dispatchTxqueue = async (leCtx) => {
    let txReqs = await leCtx.rcon.send('/dequeue_tx_queue');
    let txReqsParsed = JSON.parse(txReqs);
    let db = leCtx.db.read();
    let prevFailedTx = db.defaults({ 'failed-tx-inv': {} }).get('failed-tx-inv').value();
    let itemsQuery = {};

    if (txReqsParsed instanceof Array) {
        for (var txReq of txReqsParsed) {
            var reqId = txReq.id;
            var items = txReq.items;
            
            mergeInventory(itemsQuery, items);
        }
    }
    
    mergeInventory(itemsQuery, prevFailedTx);
    
    if (Object.keys(itemsQuery).length > 0) {
        let res = await ds9.inventory(leCtx.config, itemsQuery);

        if (res.error || (res.response.statusCode != 200)) {
            console.log('[-] DS9RC-TXRCK HTTP req failed: ' + res.error.code);
            db.set('failed-tx-inv', itemsQuery).write();
            console.log('[!] Last TXRCK query has been saved.');
        }
    }

    return Promise.resolve();
};

export default {
    dispatchRxqueue,
    dispatchTxqueue
};
