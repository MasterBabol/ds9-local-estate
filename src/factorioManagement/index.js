import fs from 'fs';
import decomp from 'decompress';
import decompTarxz from 'decompress-tarxz';
import request from 'request';
import cproc from 'child_process';

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
}

const deploy = (name, sub, options, config) => {
    if (fs.existsSync('./factorio')) {
        try {
            fs.mkdirSync('./factorio/inst');
        } catch (e) {}
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

    } else {
        console.log('[-] Any factorio directory is not found.');
    }
}
        /*let factorio = cproc.spawnSync(
            './factorio/bin/x64/factorio', [
                '-c', './factorio/inst/config/config.ini',
                '--start-server-load-latest'
                '--server-settings',
                './factorio/inst/config/server-settings.json'
            ]
        );*/

export default {
    download,
    deploy
};
