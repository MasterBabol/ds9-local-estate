import os from 'os';
import request from 'request';

const technology = {
    put: (config, signals) => {
        let reqOpt = {
            method: 'POST',
            url: config['remote-address'] + '/api/technology/' + config['local-name'],
            auth: {
                user: config['local-name'],
                password: config['accessToken']
            },
            json: signals,
            timeout: 2500
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
    },
    get: (config) => {
        let reqOpt = {
            method: 'GET',
            url: config['remote-address'] + '/api/technology',
            auth: {
                user: config['local-name'],
                password: config['accessToken']
            },
            json: true,
            timeout: 2500
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
    }
};

export default technology;

