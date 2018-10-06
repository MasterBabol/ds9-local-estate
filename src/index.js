import fs from 'fs';
import decomp from 'decompress';
import decompTarxz from 'decompress-tarxz';
import getPort from 'get-port';
import validator from 'validator';
import { Rcon } from 'rcon-client';
import args from 'args';
import request from 'request';

import configOrDie from './configOrDie';
import fman from './factorioManagement';
import watcher from './watcher';
import ds9 from './ds9RemoteApi';

console.log('[!] Checking the config file..');
const config = configOrDie();
console.log('[+] The config file seems good.');

args.command(
    'fdown',
    'Download a factorio headless server.',
    (n, s, o) => { fman.download(n, s, o, config) }
);

args.command(
    'fdeploy',
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

const argsFlags = args.parse(process.argv);

function runLocalEstate() {
    console.log('[!] Deepspace 9 local estate is starting..');
    const rcon = new Rcon({ packetResponseTimeout: 2000});

    // Announce once now
    ds9.announceAlive(config);

    const connectRcon = async () => {
        await rcon.connect({
            host: 'localhost',
            port: config['rcon-port'],
            password: config['rcon-password']
        });
        console.log('hello2');
    };

    connectRcon();

    console.log('hello');
    setTimeout(() => {

    }, 5 * 1000);

    setInterval(() => {
        ds9.announceAlive(config);
    }, 20 * 1000);
}

