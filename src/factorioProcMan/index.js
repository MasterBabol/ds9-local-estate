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
                yield {
                    type: caps[1].toLowerCase(),
                    reason: caps[2],
                    body: caps[3].trim()
                };
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

        let delmods = cproc.execSync(
            'rm -f ./factorio/inst/mods/deepspace*', {stdio:[0,1,2]}
        );

        if (options.modonly) {
            let copy = cproc.spawnSync(
                'cp', ['-Rf','./deploy_pack/mods/.','./factorio/inst/mods/']
            );
            if (copy.status == 0) {
                console.log('[+] Mod files are successfully copied.');
            } else {
                console.log('[-] Failed to copy mod files.');
                process.exit(2);
            }
        } else {
            let copy = cproc.spawnSync(
                'cp', ['-Rf','./deploy_pack/.','./factorio/inst/']
            );
            if (copy.status == 0) {
                console.log('[+] Deploy pack files are successfully copied.');
            } else {
                console.log('[-] Failed to copy deploy pack files.');
                process.exit(2);
            }

            console.log('[!] Launching a factorio headless server..');
            let factorio = cproc.spawn(
                './factorio/bin/x64/factorio', [
                    '-c', './factorio/inst/configs/config.ini',
                    '--start-server-load-scenario',
                    'deepspace9/ds9freeplay',
                    '--map-gen-settings',
                    './factorio/inst/configs/map-gen-settings.json',
                    '--map-settings',
                    './factorio/inst/configs/map-settings.json',
                ]
            );
            factorio.stdout.on('data', (data) => {
                let res = data.toString();
                if (res.indexOf('Error') >= 0)
                    console.log(res);
                else if (res.indexOf('Save process is complete') >= 0) {
                    factorio.stdin.write('/quit\n');
                } else if (res.indexOf('Goodbye') >= 0) {
                    console.log('[+] A factorio instance is now ready.');
                    process.exit(0);
                }
            });
            factorio.stdin.write('/server_save manualsave\n');
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
    this.once = (eventType, callback) => {
        this.eventEmitter.once(eventType, callback);
    };
    this.start = () => {
        let proc = cproc.spawn(
            './factorio/bin/x64/factorio', [
                '-c', './factorio/inst/configs/config.ini',
                '--start-server', './factorio/inst/saves/manualsave.zip',
                '--server-settings',
                './factorio/inst/configs/server-settings.json',
                '--rcon-port', config['rcon-port'],
                '--rcon-password', config['rcon-password']
            ], {detached: true}
        );
        proc.stdout.on('data', (data) => {
            try {
                let parsedGen = parser(data.toString());
                let parsed;
                while (!(parsed = parsedGen.next()).done) {
                    if (this.eventEmitter.listeners(parsed.value.type).length > 0)
                        this.eventEmitter.emit(parsed.value.type, parsed.value);
                    if (this.eventEmitter.listeners('all').length > 0)
                        this.eventEmitter.emit('all', parsed.value);
                }
            } catch (e) {
                console.log('Unexpected error: ' + e);
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
