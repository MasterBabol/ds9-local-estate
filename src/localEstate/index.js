import ds9 from '../ds9RemoteApi';
import rocket from './rocket';
import signal from './signal';
import technology from './technology';
import electricity from './electricity';

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

const mainDispatchLoop = async (leCtx) => {
    if (checkShutdownCondition(leCtx))
        return;
    try {
        let proms = [];
        leCtx.dispatchPeriodIdx++;
        
        proms.push(rocket.dispatchRxqueue(leCtx));
        proms.push(rocket.dispatchTxqueue(leCtx));
        proms.push(signal.dispatchRxSignals(leCtx));
        proms.push(signal.dispatchTxSignals(leCtx));
        proms.push(electricity.dispatchRxElectricity(leCtx));
        proms.push(electricity.dispatchTxElectricity(leCtx));
        if ((leCtx.dispatchPeriodIdx % leCtx.config['techsync-period']) == 0) {
            proms.push(technology.dispatchResearchAnnounces(leCtx));
            proms.push(technology.dispatchResearchUpdates(leCtx));
        }
        await Promise.all(proms);
        setTimeout(() => { mainDispatchLoop(leCtx); }, 1000);
        
        return Promise.resolve();
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
    } else if (msg.type == 'error') {
        type = 'e';
    }else if (msg.type == 'gameuncat') {
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
        launcher.on('error', printFactorioLog);
        
        installSigintHandler(this);
        installAnnounceAliveWorker(this);
    
        console.log('[!] Starting main dispatcher..');
        setTimeout(() => { mainDispatchLoop(this); }, 1000);
    };
};

export default localEstate;
