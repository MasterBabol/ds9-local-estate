import ds9 from '../../ds9RemoteApi'

const dispatchRxElectricity = async (leCtx) => {
    let rxElecReqs = await leCtx.rcon.send('/collect_rx_elec_reqs');
    let rxElecReqsParsed = JSON.parse(rxElecReqs);
    let reqRxElecQuery = { 'electricity-in-mj':0 };
    
    if (rxElecReqsParsed instanceof Array) {
        for (var k of rxElecReqsParsed) {
            reqRxElecQuery['electricity-in-mj'] -= k.amount;
        }

        if (reqRxElecQuery['electricity-in-mj'] < 0) {
            let res = await ds9.inventory(leCtx.config, reqRxElecQuery, true);
            
            if (res.error) {
                console.log('[-] ds9 Api error (elec-req ret): ' + res.error);
            } else {
                if (res.response) {
                    if (res.response.statusCode == 200) {
                        let ret = res.body;
                        var elecPool = ret['electricity-in-mj'] / reqRxElecQuery['electricity-in-mj'];
                        
                        for (var k of rxElecReqsParsed) {
                            k.amount *= elecPool;
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
    let txElecsQuery = { 'electricity-in-mj':0 };
    
    if (txElecsParsed instanceof Array) {
        for (var k of txElecsParsed) {
            txElecsQuery['electricity-in-mj'] += k.amount;
        }
    }

    if (txElecsQuery['electricity-in-mj'] > 0)
        ds9.inventory(leCtx.config, txElecsQuery);
};

export default {
    dispatchRxElectricity,
    dispatchTxElectricity
};
