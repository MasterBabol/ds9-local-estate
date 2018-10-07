import os from 'os';
import request from 'request';

const announceAlive = (config) => {
    let cpuAvg = os.loadavg()[0];
    let memTotal = os.totalmem();
    let memFree = os.freemem();

    let reqOpt = {
        method: 'POST',
        url: config['remote-address'] + '/api/status/' + config['local-name'],
        auth: {
            user: config['local-name'],
            password: config['accessToken']
        },
        json: {
            'cpuUse%': Number((100 * cpuAvg).toFixed(1)),
            'memUse%': Number((100 * (memTotal - memFree) / memTotal).toFixed(1)),
            'memTotalMB': Math.floor(memTotal / 1024 / 1024)
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

export default announceAlive;
