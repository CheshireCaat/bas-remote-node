const { createWriteStream } = require('fs');
const { dirname } = require('path');
const https = require('https');
const fs = require('fs');

const rmdirRecursive = (dir) => {
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach((file) => {
            const curPath = `${dir}/${file}`;
            if (fs.lstatSync(curPath).isDirectory()) {
                rmdirRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(dir);
    }
};

const mkdirRecursive = (dir) => {
    const name = dirname(dir);

    if (!fs.existsSync(dir)) {
        mkdirRecursive(name);
        fs.mkdirSync(dir);
    }
};

const download = (url, filePath) => new Promise((resolve) => {
    const file = createWriteStream(filePath);

    https.get(url, (response) => {
        response.on('data', (chunk) => {
            file.write(chunk);
        });

        response.on('end', () => {
            file.end();
            resolve();
        });
    });
});

const request = (url) => new Promise((resolve) => {
    let str = '';

    https.get(url, (response) => {
        response.on('data', (chunk) => {
            str += chunk;
        });

        response.on('end', () => {
            resolve(JSON.parse(str));
        });
    });
});

const inject = (promise, client, threadId) => {
    const injected = promise;

    const thenDef = injected.then;
    injected.then = (...args) => inject(thenDef.apply(injected, args), client, threadId);

    const catchDef = injected.catch;
    injected.catch = (...args) => inject(catchDef.apply(injected, args), client, threadId);

    const finallyDef = injected.finally;
    injected.finally = (...args) => inject(finallyDef.apply(injected, args), client, threadId);

    injected.stop = () => client._stopThread(threadId);

    injected.threadId = threadId;

    return injected;
};

const throwIf = (condition, message) => {
    if (condition) {
        throw new Error(message);
    }
};

const random = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

module.exports = { rmdirRecursive, mkdirRecursive, download, request, throwIf, inject, random };
