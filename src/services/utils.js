const fs = require('fs');
const http = require('http');
const https = require('https');

exports.request = (url) => new Promise((resolve, reject) => {
  let str = '';

  get(url, (response) => {
    response.on('data', (chunk) => {
      str += chunk;
    });

    response.on('end', () => {
      try { // if string contains bad content
        resolve(JSON.parse(str));
      } catch (e) {
        reject(e)
      }

    });
  });
});

exports.download = (url, path) => new Promise((resolve) => {
  const file = fs.createWriteStream(path);

  get(url, (response) => {
    response.on('data', (chunk) => {
      file.write(chunk);
    });

    response.on('end', () => {
      file.end();
      resolve();
    });
  });
});

const get = (url, ...args) => (url.includes('http:') ? http : https).get(url, ...args);
