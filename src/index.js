import poly from 'babel-polyfill';
import fs from 'fs';
import decomp from 'decompress';
import decompTarxz from 'decompress-tarxz';
import getPort from 'get-port';
import validator from 'validator';
import { Rcon } from 'rcon-client';
import args from 'args';
import request from 'request';
import { EventEmitter } from 'events';
import lowDB from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

import configOrDie from './configOrDie';
import fman from './factorioProcMan';
import localEstate from './localEstate';
import ds9 from './ds9RemoteApi';

console.log('[!] Checking the config file..');
const config = configOrDie();
console.log('[+] The config file seems good.');

const dbAdapter = new FileSync('db.json');
const db = lowDB(dbAdapter);

args.command(
    'download',
    'Download a factorio headless server.',
    (n, s, o) => { fman.download(n, s, o, config) }
);

args.command(
    'deploy',
    'Deploy a factorio game server with map initialization.',
    (n, s, o) => { fman.deploy(n, s, o, config) }
);

args.command(
    'start',
    'Start a local estate.',
    (n, s, o) => { runLocalEstate(); }
);

args.option(
    'force', 'force your decision', false
);

args.option(
    'modonly', 'deploy mod files only (with deploy command)', false
);

const argsFlags = args.parse(process.argv);

function runLocalEstate() {
    console.log('[!] Deepspace 9 local estate is starting..');

    // announceAlive once now; TODO: change to le annouce
    ds9.announceAlive(config);

    let launcher = new fman.launcher(config);
    let rconDetector = new EventEmitter();

    launcher.on('info', (msg) => {
        if (msg.reason == 'RemoteCommandProcessor' &&
            (msg.body.indexOf('Starting RCON interface') >= 0)
        )
            rconDetector.emit('fRCONlistening');
    });

    rconDetector.once('fRCONlistening', () => {
        console.log('[+] Factorio server Rcon interface is ready');
        const rcon = new Rcon({ packetResponseTimeout: 2100000000});
        // practically infinite (rcon-client does not support infinite timeout)

        rcon.onDidConnect(() => {
            console.log('[+] Rcon interface is now ready.');
        });

        rcon.onDidAuthenticate(() => {
            console.log('[+] Rcon connection is successfully authenticated.');

            let le = new localEstate(config, launcher, rcon, db);
            le.run();
        });

        rcon.connect({
            host: 'localhost',
            port: config['rcon-port'],
            password: config['rcon-password']
        });
    });

    console.log('[!] Launching a factorio server instance..');
    launcher.start();
}

