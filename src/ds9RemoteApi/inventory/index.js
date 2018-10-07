import os from 'os';
import request from 'request';

const inventory = (config, items, callback) => {

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

    return new Promise((resolve, reject) => {
        request(reqOpt, (err, res) => {
            resolve({
                error: err,
                response: res
            });
        });
    });
};

export default inventory;
