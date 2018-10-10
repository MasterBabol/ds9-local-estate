import ds9 from '../../ds9RemoteApi'

const dispatchRxElectricity = async (leCtx) => {
    let rxElecReqs = await leCtx.rcon.send('/collect_rx_elec_reqs');
    let rxElecReqsParsed = JSON.parse(rxElecReqs);
    let reqRxElecQuery = { 'electricity-in-kw':0 };

    if (rxElecReqsParsed instanceof Array) {
        for (var k of rxElecReqsParsed) {
            reqRxElecQuery['electricity-in-kw'] -= rxElecReqsParsed[k].amount;
        }
        
        if (reqRxElecQuery['electricity-in-kw'] < 0) {
            let res = await ds9.inventory(leCtx.config, reqRxElecQuery);
            
            if (res.error) {
                console.log('[-] ds9 Api error (elec-req ret): ' + res.error);
            } else {
                if (res.response) {
                    if (res.response.statusCode != 200) {
                        let ret = JSON.parse(res.body);
                        var elecPool = ret['electricity-in-kw'] / reqRxElecQuery['electricity-in-kw'];
                        
                        for (var k of rxElecReqsParsed) {
                            rxElecReqsParsed[k].amount *= elecPool;
                        }
                        
                        leCtx.rcon.send('/set_rx_elecs ' + JSON.stringify(rxElecReqsParsed));
                    }
                } else {
                    console.log('[-] Unexpected ds9 Api error: No resp');
                }
            }
        }
    }
};

const dispatchTxElectricity = async (leCtx) => {
    let txElecs = await leCtx.rcon.send('/collect_tx_elecs');
    let txElecsParsed = JSON.parse(txElecs);
    let txElecsQuery = { 'electricity-in-kw':0 };

    if (txElecsParsed instanceof Array) {
        for (var k of txElecsParsed) {
            txElecsQuery['electricity-in-kw'] += txElecsParsed[k].amount;
        }
    }

    if (txElecsQuery['electricity-in-kw'] > 0)
        ds9.inventory(leCtx.config, txElecsQuery);
};

export default {
    dispatchRxElectricity,
    dispatchTxElectricity
};