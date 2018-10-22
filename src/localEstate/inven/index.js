import ds9 from '../../ds9RemoteApi'

const dispatchRxInvensigs = async (leCtx) => {
    let rxSignalReqs = await leCtx.rcon.send('/collect_rx_invensig_reqs');
    let rxSigReqsParsed = JSON.parse(rxSignalReqs);

    if (rxSigReqsParsed instanceof Array) {
        let res = await ds9.inventory.get(leCtx.config);
        
        if (!res.error && (res.response.statusCode == 200)) {
            let sigList = res.body;
            for (var rxSigKey of Object.keys(rxSigReqsParsed)) {
                if (sigList[rxSigReqsParsed[rxSigKey].name] != undefined) {
                    rxSigReqsParsed[rxSigKey].count =
                        sigList[rxSigReqsParsed[rxSigKey].name];
                } else
                    rxSigReqsParsed[rxSigKey].count = 0;
            }
            
            if (Object.keys(rxSigReqsParsed).length > 0)
                await leCtx.rcon.send('/set_rx_invensigs ' + JSON.stringify(rxSigReqsParsed));
        } else {
            let reason;
            if (res.error)
                reason = res.error.code;
            else
                reason = "HTTP " + res.response.statusCode;
            
            
            console.log('[-] DS9RC-RXSIG HTTP req failed: ' + reason);
        }
    }

    return Promise.resolve();
};

export default {
    dispatchRxInvensigs
};
