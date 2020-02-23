const https = require('https');
const fs = require('fs');

const download = (url, filePath) => new Promise((resolve) => {
    const file = fs.createWriteStream(filePath);

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

module.exports = { download, request, throwIf, inject, random };
