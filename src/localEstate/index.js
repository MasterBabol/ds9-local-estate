import ds9 from '../ds9RemoteApi';

const factorioSafeExit = async (leCtx) => {
    try {
        let resp = false;
        console.log('[!] Attempting to save the game..');
        leCtx.launcher.on('all', (msg) => {
            console.log('[!] ' + msg.body);
            if (msg.body.indexOf('Saving game as') >= 0) {
                resp = true;
            } else if (msg.body.indexOf('Saving finished') >= 0) {
                console.log('[+] Game saving finished.');
                leCtx.rcon.send('/quit');
                process.exit(0);
            }
        });
        leCtx.rcon.send('/c game.server_save()');
        setTimeout(() => {
            if (!resp) {
                console.log('[-] Saving process is timed out. Forcing shutdown..');
                leCtx.launcher.proc.kill('SIGINT');
                process.exit(0);
            }
        }, 10000);
    } catch (e) {
        console.log(e);
        process.exit(-1);
    }
    return true;
};

const enterShutdownProcess = (leCtx) => {
    console.log('[!] Waiting other workers before the shutdown..');
    leCtx.shutdownState = true;
    let exitWatchdog = setInterval(() => {
        if (leCtx.shutdownReady) {
            console.log('[+] All workers stopped for the shutdown.');
            clearInterval(exitWatchdog);
            factorioSafeExit(leCtx);
        } else {
            console.log('[!] Still waiting..');
        }
    }, 3 * 1000);
};

const installSigintHandler = (leCtx) => {
    process.once('SIGINT', () => {
        process.on('SIGINT', () => {});
        console.log('\n[!] Received SIGINT. Entering shutdown state..');
        enterShutdownProcess(leCtx);
    });
};

const checkShutdownCondition = (leCtx) => {
    if (leCtx.shutdownState) {
        leCtx.shutdownReady = true;
        return true;
    }
    return false;
};

const cleanStopAndSaveAllWorkers = (leCtx) => {
};

const installAnnounceAliveWorker = (leCtx) => {
    setInterval(() => {
        ds9.announceAlive(leCtx.config).then((res) => {
            if (res.error) {
                console.log('[-] Cannot connect to DS9 Remote cloud: ' + res.error.code);
                enterShutdownProcess(leCtx);
            }
        });
    }, 20 * 1000);
};

const confirmRxReservation = (leCtx, req) => {
    const rcon = leCtx.rcon;
    rcon.send('/confirm_rx_reservation ' + JSON.stringify(req));
};

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
                                        confirmRxReservation(leCtx, rxReq);
                                        break;
                                    case 404:
                                        break;
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
                    let sigList = JSON.parse(rxQueryRes.body);
                    for (var rxSigKey of Object.keys(rxSigReqsParsed)) {
                        if (sigList[rxSigReqsParsed[rxSigKey].name] != undefined) {
                            rxSigReqsParsed[rxSigKey].count =
                                sigList[rxSigReqsParsed[rxSigKey].name];
                        } else
                            rxSigReqsParsed[rxSigKey].count = 0;
                    }
                    if (Object.keys(rxSigReqsParsed).length > 0)
                        leCtx.rcon.send('/set_rx_signals ' + JSON.stringify(rxSigReqsParsed));
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

const dispatchResearchAnnounces = async (leCtx) => {
    let curTechs = await leCtx.rcon.send('/collect_technology_researches');
    let curTechsParsed = JSON.parse(curTechs);
    let techQuery = {};

    if (curTechsParsed instanceof Array) {
        for (var techKey of Object.keys(curTechsParsed)) {
            var tech = curTechsParsed[techKey];
            techQuery[tech.name] = {
                researched: tech.researched,
                level: tech.level
            };

            ds9.technology.put(leCtx.config, techQuery);
        }
    }
}

const dispatchResearchUpdates = async (leCtx) => {
    let res = await ds9.technology.get(leCtx.config);
    if (res.error) {
        console.log('[-] ds9 Api error (tech ret): ' + res.error);
    } else {
        if (res.response) {
            let techUpdateQuery = [];
            let teches = JSON.parse(res.body);
            for (var techKey of Object.keys(teches)) {
                var curTech = teches[techKey];
                techUpdateQuery.push({
                    name: techKey,
                    researched: curTech.researched,
                    level: curTech.level
                });
            }
            leCtx.rcon.send('/set_technologies ' + JSON.stringify(techUpdateQuery));
        } else {
            console.log('[-] Unexpected ds9 Api error: No resp');
        }
    }
}

const mainDispatchLoop = async (leCtx) => {
    if (checkShutdownCondition(leCtx))
        return cleanStopAndSaveAllWorkers(leCtx);
    try {
        leCtx.dispatchPeriodIdx++;
        dispatchRxqueue(leCtx);
        dispatchTxqueue(leCtx);
        dispatchRxSignals(leCtx);
        dispatchTxSignals(leCtx);
        if ((leCtx.dispatchPeriodIdx % leCtx.config['techsync-period']) == 0) {
            dispatchResearchAnnounces(leCtx);
            dispatchResearchUpdates(leCtx);
        }
    } catch (e) {
        console.log('[-] Unexpected error occured: ' + e);
        process.kill(process.pid, 'SIGINT');
    }
};

const printFactorioLog = (msg) => {
    let type = '!';
    if (msg.type == 'game') {
        type = 'g';
    } else if (msg.type == 'info') {
        type = 'i';
    } else if (msg.type == 'gameuncat') {
        type = 'u';
    } else if (msg.type == 'norm') {
        type = 'n';
    }
    console.log('[' + type + '] [' + msg.reason + '] ' + msg.body);
};

const localEstate = function(config, launcher, rcon, lowdb) {    
    this.config = config;
    this.launcher = launcher;
    this.rcon = rcon;
    this.db = lowdb;
    
    this.shutdownState = false;
    this.shutdownReady = false;
    this.dispatchPeriodIdx = 0;
    
    this.run = async () => {
        console.log('[!] Preparing for main dispatcher..');
        let disableAchievements = await rcon.send('/c');
        launcher.on('game', printFactorioLog);
        launcher.on('norm', printFactorioLog);
        
        installSigintHandler(this);
        installAnnounceAliveWorker(this);
    
        console.log('[!] Starting main dispatcher..');
        setInterval(() => { mainDispatchLoop(this); }, 1000);
    };
};

export default localEstate;
