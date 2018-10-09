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

    return new Promise((resolve, reject) => {
        request(reqOpt, (err, res, body) => {
            resolve({
                error: err,
                response: res,
                body: body
            });
        });
    });
};

export default inventory;

