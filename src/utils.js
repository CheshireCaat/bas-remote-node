const fs = require('fs');
const https = require('https');

const download = (url, path) => new Promise((resolve) => {
  const file = fs.createWriteStream(path);

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

const inject = (promise, client, threadId) => ({
  threadId,
  stop: () => client._stopThread(threadId),
  then: (...args) => inject(promise.then(...args), client, threadId),
  catch: (...args) => inject(promise.catch(...args), client, threadId),
  finally: (...args) => inject(promise.finally(...args), client, threadId),
});

const throwIf = (condition, message) => {
  if (condition) throw new Error(message);
};

const random = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

module.exports = { download, request, throwIf, inject, random };
