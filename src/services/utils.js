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
      try {
        resolve(JSON.parse(str));
      } catch (err) {
        reject(err);
      }
    });
  }).on('error', (err) => reject(err));
});

exports.download = (url, path) => new Promise((resolve, reject) => {
  const file = fs.createWriteStream(path);

  get(url, (response) => {
    response.on('data', (chunk) => {
      file.write(chunk);
    });

    response.on('end', () => {
      file.end();
      resolve();
    });
  }).on('error', (err) => reject(err));
});

const get = (url, ...args) => (url.includes('http:') ? http : https).get(url, ...args);
