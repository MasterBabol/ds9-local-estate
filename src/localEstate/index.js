import ds9 from '../ds9RemoteApi';

const installSigintHandler = (config, launcher, rcon, leCtx) => {
    process.once('SIGINT', () => {
        console.log('[!] Received SIGINT');
        let saveFunc = async () => {
            try {
                if (leCtx.shutdownState)
                    return;
                leCtx.shutdownState = true;
                let resp = false;
                console.log('[!] Attempting to same the game..');
                launcher.on('all', (msg) => {
                    console.log('[!] ' + msg.body);
                    if (msg.body.indexOf('Saving game as') >= 0) {
                        resp = true;
                    } else if (msg.body.indexOf('Saving finished') >= 0) {
                        console.log('[+] Game saving finished.');
                        rcon.send('/quit');
                        process.exit(0);
                    }
                });
                rcon.send('/c game.server_save()');
                setTimeout(() => {
                    if (!resp) {
                        console.log('[-] Saving process is timeout. Forcing shutdown..');
                        launcher.proc.kill('SIGINT');
                        process.exit(0);
                    }
                }, 5000);
            } catch (e) {
                console.log(e);
                process.exit(-1);
            }
        };
        saveFunc();
    });
}

const rxtxRocketHandler = async (config, launcher, rcon, lowdb, leCtx) => {
    try {
        if (leCtx.shutdownState)
            return;
        let db = lowdb.read();

        let prevRxReqs = db.defaults({ rx: [] }).get('previousRxReqs');
        let rxReqs = await rcon.send('/dequeue_rx_queue');
        let rxReqsParsed = JSON.parse(rxReqs);

        if (rxReqsParsed instanceof Array) {
            for (var rxReq of rxReqsParsed) {
            }
        }
    } catch (e) {
        console.log('[-] Unexpected error occured: ' + e);
        process.kill(process.pid, 'SIGINT');
    }
};

const localEstate = function(config, launcher, rcon, lowdb) {
    this.shutdownState = false;
    this.run = async () => {
        let disableAchievements = await rcon.send('/c');
        installSigintHandler(config, launcher, rcon, this);

        launcher.on('all', (msg) => { console.log(msg); });

        setTimeout(() => {
            rxtxRocketHandler(config, launcher, rcon, lowdb, this);
        }, 5 * 1000);

        setInterval(() => {
            ds9.announceAlive(config);
        }, 20 * 1000);
    };
};

export default localEstate;
