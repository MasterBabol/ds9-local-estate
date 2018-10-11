import fs from 'fs';
import validator from 'validator';

const get = () => {
    try {
        let config = JSON.parse(fs.readFileSync('config.json'));
        if (!config['remote-address'] ||
            !validator.isURL(config['remote-address'], {
                require_tld: false,
                require_protocol: true
            }))
            throw 'remote-address is not valid';

        if (!config['rcon-port'] || isNaN(config['rcon-port']))
            throw 'rcon-port is not valid';

        if (!config['rcon-password'])
            throw 'rcon-password is not valid';

        if (!config['game-version'])
            throw 'game version is not valid';

        if (!config['update-period'] || isNaN(config['update-period']))
            throw 'update period is not valid';

        if (!config['techsync-period'] || isNaN(config['techsync-period']))
            throw 'techsync period is not valid';

        if (!config['autosave-period'] || isNaN(config['autosave-period']))
            throw 'autosave period is not valid';

        return config;
    } catch (e) {
        console.log('[-] Config file error: ' + e);
        process.exit(-1);
    }
};

export default get;
