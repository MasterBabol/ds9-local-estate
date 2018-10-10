import ds9 from '../../ds9RemoteApi'

const dispatchRxSignals = async (leCtx) => {
    let rxSignalReqs = await leCtx.rcon.send('/collect_rx_signal_reqs');
    let rxSigReqsParsed = JSON.parse(rxSignalReqs);

    if (rxSigReqsParsed instanceof Array) {
        let rxQueryRes = await ds9.signal.get(leCtx.config);
        if (rxQueryRes.error) {
            console.log('[-] ds9 Api error (rxs ret): ' + result.error);
        } else {
            if (rxQueryRes.response) {
                if (rxQueryRes.response.statusCode == 200) {
                    let sigList = rxQueryRes.body;
                    for (var rxSigKey of Object.keys(rxSigReqsParsed)) {
                        if (sigList[rxSigReqsParsed[rxSigKey].name] != undefined) {
                            rxSigReqsParsed[rxSigKey].count =
                                sigList[rxSigReqsParsed[rxSigKey].name];
                        } else
                            rxSigReqsParsed[rxSigKey].count = 0;
                    }
                    if (Object.keys(rxSigReqsParsed).length > 0)
                        await leCtx.rcon.send('/set_rx_signals ' + JSON.stringify(rxSigReqsParsed));
                }
            } else {
                console.log('[-] Unexpected ds9 Api error: No resp');
            }
        }
    }
};

const dispatchTxSignals = async (leCtx) => {
    let txSignals = await leCtx.rcon.send('/collect_tx_signals');
    let txSignalsParsed = JSON.parse(txSignals);
    let txSignalsQuery = {};

    if (txSignalsParsed instanceof Array) {
        for (var txSigKey of Object.keys(txSignalsParsed)) {
            var txSig = txSignalsParsed[txSigKey];
            txSignalsQuery[txSig.name] = txSig.count;
        }
    }

    ds9.signal.put(leCtx.config, txSignalsQuery);
};

export default {
    dispatchRxSignals,
    dispatchTxSignals
};
