import ds9 from '../ds9RemoteApi';

const factorioSafeExit = async (leCtx) => {
    try {
        let resp = false;
        console.log('[!] Attempting to same the game..');
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
        }, 5000);
    } catch (e) {
        console.log(e);
        process.exit(-1);
    }
    return true;
};

const enterShutdownProcess = (leCtx) => {
    console.log('[!] Received SIGINT. Waiting other workers before the shutdown..');
    leCtx.shutdownState = true;
    let exitWatchdog = setInterval(() => {
        if (leCtx.shutdownReady) {
            console.log('[+] All workers stopped for the shutdown.');
            clearInterval(exitWatchdog);
            factorioSafeExit(leCtx);
        }
    }, 5 * 1000);
};

const installSigintHandler = (leCtx) => {
    process.once('SIGINT', () => {
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
        ds9.announceAlive(leCtx.config);
    }, 20 * 1000);
};

const mainDispatchLoop = async (leCtx) => {
    if (checkShutdownCondition(leCtx))
        return cleanStopAndSaveAllWorkers(leCtx);
    try {
        let rxReqs = await leCtx.rcon.send('/dequeue_rx_queue');
        let rxReqsParsed = JSON.parse(rxReqs);

        if (rxReqsParsed instanceof Array) {
            for (var rxReq of rxReqsParsed) {
                var reqId = rxReq.id;
                var reqType = rxReq.type;
                var items = rxReq.items;
                
                var prevReqWorkerState = leCtx.workerStates[reqId];
                var prevReqWorker = leCtx.workers[reqId];
                
                switch (reqType) {
                    case RXREQTYPE_RESERVE:
                        var itemNames = Object.keys(items);
                        for (var itemName of itemNames) {
                            if (items[itemName] <= 0)
                                delete items[itemName];
                            else
                                items[itemName] *= -1; // convert to negative number (for item request)
                        }
                        if (Object.keys(items).length > 0)
                            ds9.inventory(leCtx.config, items);
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
                        if (Object.keys(items).length > 0)
                            ds9.inventory(leCtx.config, items);
                        break;
                }
            }
        }
    } catch (e) {
        console.log('[-] Unexpected error occured: ' + e);
        process.kill(process.pid, 'SIGINT');
    }
};

const localEstate = function(config, launcher, rcon, lowdb) {    
    this.config = config;
    this.launcher = launcher;
    this.rcon = rcon;
    this.db = lowdb;
    
    this.shutdownState = false;
    this.shutdownReady = false;
    
    this.run = async () => {
        let disableAchievements = await rcon.send('/c');
        launcher.on('game', (msg) => { console.log(msg); });
        
        installSigintHandler(this);
        restorePreviousWorkers(this);
        installAnnounceAliveWorker(this);
        
        mainDispatchLoop(this);
    };
};

export default localEstate;
