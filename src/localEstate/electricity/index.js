import ds9 from '../../ds9RemoteApi'

const dispatchRxElectricity = async (leCtx) => {
    let rxElecReqs = await leCtx.rcon.send('/collect_rx_elec_reqs');
    let rxElecReqsParsed = JSON.parse(rxElecReqs);
    let reqRxElecQuery = { 'electricity-in-mj':0 };
    
    if (rxElecReqsParsed instanceof Array) {
        for (var k of rxElecReqsParsed) {
            reqRxElecQuery['electricity-in-mj'] -= k.amount;
        }
    }

    if (reqRxElecQuery['electricity-in-mj'] < 0) {
        let res = await ds9.inventory(leCtx.config, reqRxElecQuery, true);
        
        if (!res.error && (res.response.statusCode == 200)) {
            let ret = res.body;
            var elecPool = ret['electricity-in-mj'] / reqRxElecQuery['electricity-in-mj'];
            
            for (var k of rxElecReqsParsed) {
                k.amount *= elecPool;
            }
            
            await leCtx.rcon.send('/set_rx_elecs ' + JSON.stringify(rxElecReqsParsed));
        } else {
            console.log('[-] DS9RC-RXEL HTTP req failed: ' + res.error.code);
        }
    }

    return Promise.resolve();
};

const dispatchTxElectricity = async (leCtx) => {
    let txElecs = await leCtx.rcon.send('/collect_tx_elecs');
    let txElecsParsed = JSON.parse(txElecs);
    let txElecsQuery = { 'electricity-in-mj': 0 };
    let db = leCtx.db.read();
    let prevFailedElec = db.defaults({ 'failed-tx-elec': 0 }).get('failed-tx-elec');
    
    if (txElecsParsed instanceof Array) {
        for (var k of txElecsParsed) {
            txElecsQuery['electricity-in-mj'] += k.amount;
        }
    }
    
    txElecsQuery['electricity-in-mj'] += prevFailedElec.value();

    if (txElecsQuery['electricity-in-mj'] > 0) {
        let res = await ds9.inventory(leCtx.config, txElecsQuery);
        
        if (!res.error && (res.response.statusCode == 200)) {
            db.set('failed-tx-elec', 0).write();
        } else {
            console.log('[-] DS9RC-TXEL HTTP req failed: ' + res.error.code);
            db.set('failed-tx-elec', txElecsQuery['electricity-in-mj']).write();
            console.log('[!] Last TXEL query has been saved.');
        }
    }

    return Promise.resolve();
};

export default {
    dispatchRxElectricity,
    dispatchTxElectricity
};
