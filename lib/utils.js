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

const inject = (promise, client, threadId) => ({
  threadId,
  stop: () => client._stopThread(threadId),
  then: (...args) => inject(promise.then(...args), client, threadId),
  catch: (...args) => inject(promise.catch(...args), client, threadId),
  finally: (...args) => inject(promise.finally(...args), client, threadId),
});

const throwIf = (condition, message) => {
  if (condition) {
    throw new Error(message);
  }
};

const random = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

module.exports = { rmdirRecursive, mkdirRecursive, download, request, throwIf, inject, random };
