import fs from 'fs';
import decomp from 'decompress';
import decompTarxz from 'decompress-tarxz';
import request from 'request';
import cproc from 'child_process';
import { EventEmitter } from 'events';

const download = (name, sub, options, config) => {
    if (fs.existsSync('./factorio')) {
        if (!options.force) {
            console.log('[-] A factorio directory was found. ' +
                'Delete the directory and try again.\n' + 
                '[!] To force download, try again with a --force option.');
            return;
        }
    }

    console.log('[!] Downloading..');
    let fileName = './factorio-' + config['game-version'] + '.tar.xz';
    let writeStream = request.get({
        uri: 'https://www.factorio.com/get-download/'
        + config['game-version'] + '/headless/linux64'
    })
        .on('error', (err) => {
            console.log("[-] Failed to download a Factorio server.");
        })
        .pipe(fs.createWriteStream(fileName));
    writeStream.on('finish', () => {
        console.log('[+] File download is successfully finished.');

        console.log('[!] Decompressing..');
        decomp(fileName, './', {
            plugins: [ decompTarxz()  ]
        }).then(() => {
            console.log('[+] Decompress is successfully finished.');
            console.log('[+] A factorio headless server binary is now ready.');
        });
    });
};

const parser = function* (stringLines) {
    let parseRegex = /(?:\s+(?:\d+\.\d+)\s(?:(?:(\w+)\s(\w+)\.cpp:\d+:\s(.*))|(?:(.+))))|(?:\d{4}-\d{1,2}-\d{1,2}\s\d{1,2}:\d{1,2}:\d{1,2}\s(?:\[(\w+)\]\s)?(.*))\n?/g;
    let caps;
    while ((caps = parseRegex.exec(stringLines)) !== null) {
        if (typeof(caps[6]) != 'undefined') {
            if (typeof(caps[5]) != 'undefined')
                yield {
                    type: 'game',
                    reason: caps[5],
                    body: caps[6].trim()
                };
            else
                yield {
                    type: 'gameuncat',
                    reason: '',
                    body: caps[6].trim()
                };
        }
        else {
            if (caps[1]) {
                if (caps[1] == "Info") {
                    yield {
                        type: 'info',
                        reason: caps[2],
                        body: caps[3].trim()
                    };
                } else if (caps[1] == "Error") {
                    yield {
                        type: 'error',
                        reason: caps[2],
                        body: caps[3].trim()
                    };
                }
            } else
                yield {
                    type: 'norm',
                    reason: '',
                    body: caps[4].trim()
                };
        }
    }
};

const deploy = (name, sub, options, config) => {
    if (fs.existsSync('./factorio')) {
        try {
            fs.mkdirSync('./factorio/inst');
        } catch (e) {}

        if (options.modonly) {
            let copy = cproc.spawnSync(
                'cp', ['-Rf','./deploy_pack/mods/.','./factorio/inst/mods/']
            );
            console.log('[+] Mod files are successfully copied.');
        } else {
            let copy = cproc.spawnSync(
                'cp', ['-Rf','./deploy_pack/.','./factorio/inst/']
            );
            console.log('[+] Deploy pack files are successfully copied.');

            console.log('[!] Launching a factorio headless server..');
            let factorio = cproc.spawnSync(
                './factorio/bin/x64/factorio', [
                    '-c', './factorio/inst/config/config.ini',
                    '--create',
                    './factorio/inst/saves/manualsave.zip',
                    '--map-gen-settings',
                    './factorio/inst/config/map-gen-settings.json',
                    '--map-settings',
                    './factorio/inst/config/map-settings.json',
                ]
            );
            let mapCreateResponse = factorio.stdout.toString();
            let errorDetectRegex = /Error\s+(.*)/g;
            let detectedError = mapCreateResponse.match(errorDetectRegex);
            if (detectedError)
                for (var err of detectedError)
                    console.log('[-] Factorio ' + err);
            else
                console.log('[+] A factorio instance is now ready.');
        }
    } else {
        console.log('[-] Any factorio directory is not found.');
    }
};

const launcher = function (config) {
    this.eventEmitter = new EventEmitter();
    this.on = (eventType, callback) => {
        this.eventEmitter.on(eventType, callback);
    };
    this.start = () => {
        let proc = cproc.spawn(
            './factorio/bin/x64/factorio', [
                '-c', './factorio/inst/config/config.ini',
                '--start-server', './factorio/inst/saves/manualsave.zip',
                '--server-settings',
                './factorio/inst/config/server-settings.json',
                '--rcon-port', config['rcon-port'],
                '--rcon-password', config['rcon-password']
            ], {detached: true}
        );
        proc.stdout.on('data', (data) => {
            let parsedGen = parser(data.toString());
            let parsed;
            while (!(parsed = parsedGen.next()).done) {
                this.eventEmitter.emit(parsed.value.type, parsed.value);
                this.eventEmitter.emit('all', parsed.value);
            }
        });
        this.proc = proc;
    };
};

export default {
    download,
    deploy,
    launcher
};
