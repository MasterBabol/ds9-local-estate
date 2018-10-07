import os from 'os';
import request from 'request';

const inventory = (config, items) => {

    let reqOpt = {
        method: 'POST',
        url: config['remote-address'] + '/api/inventory',
        auth: {
            user: config['local-name'],
            password: config['accessToken']
        },
        json: {
            "items": items
        }
    };

    request(reqOpt, (err, res, body) => {
        if (err)
            console.log(err);
    });
};

export default inventory;

