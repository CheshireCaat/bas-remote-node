const { EventEmitter } = require('events');
const { createHash } = require('crypto');
const axios = require('axios').default;

const DOWNLOAD_TIMEOUT = 1200000;
const DEFAULT_TIMEOUT = 10000;
const CHUNK_SIZE = 10485760;
const RETRY_SLEEP = 2000;
const RETRY_COUNT = 30;

module.exports = class ScriptDownloader extends EventEmitter {
  async get(url) {
    let [strict, meta] = [false, { url }];

    try {
      this.emit('log', `Download metadata from the ${url}.meta.json`);
      const { data } = await axios.get(`${url}.meta.json`, { timeout: DEFAULT_TIMEOUT });

      if (typeof data === 'object' && ['TotalSize', 'Checksum', 'Chunks', 'Url'].every((key) => key in data)) {
        meta = {
          url: data.Url,
          chunks: data.Chunks,
          checksum: data.Checksum,
          size: Number(data.TotalSize),
        };
        strict = true;
        this.emit('log', 'Valid metadata - enable strict mode');
      } else {
        strict = false;
        this.emit('log', 'Wrong metadata - disable strict mode');
      }
    } catch (err) {
      throw new Error(`Error during metadata download - ${err.message}`);
    }

    if (!strict) {
      try {
        this.emit('log', 'Trying to get file size');
        const { headers } = await axios.get(url, {
          timeout: DEFAULT_TIMEOUT,
          headers: { Range: 'bytes=0-0' },
        });

        if (headers['content-range']) {
          const size = Number(headers['content-range'].split('/').pop());

          if (size) {
            this.emit('log', `Obtained file size - ${meta.size = size}`);
          } else {
            throw new Error('The `Content-Range` header is invalid');
          }
        } else {
          throw new Error('The `Content-Range` header is missing');
        }
      } catch (err) {
        throw new Error(`Error during file size retrieval - ${err.message}`);
      }
    }

    return Buffer.concat(await this.download(meta, strict));
  }

  async download(meta, strict) {
    const chunks = [];
    let attempt = 0;
    let offset = 0;

    while (offset < meta.size) {
      const source = axios.CancelToken.source();
      let previousSpeed = 0;
      let actualSpeed = 0;
      const timer = setInterval(() => {
        this.emit('log', `Downloaded ${actualSpeed - previousSpeed} bytes`);
        if (actualSpeed - previousSpeed < 307200) {
          source.cancel();
          return;
        }
        previousSpeed = actualSpeed;
      }, 20000);
      try {
        this.emit('log', `Start download chunk - ${offset}`);
        const { data } = await axios.get(meta.url, {
          cancelToken: source.token,
          timeout: DOWNLOAD_TIMEOUT,
          responseType: 'arraybuffer',
          onDownloadProgress: ({ loaded }) => (actualSpeed = loaded),
          headers: { Range: `bytes=${offset}-${offset + CHUNK_SIZE - 1}` },
        });

        if (strict) {
          validate([data], meta.chunks[chunks.length]);
        }

        this.emit('log', 'Chunk download success');
        offset += CHUNK_SIZE;
        chunks.push(data);
      } catch (err) {
        if (++attempt > RETRY_COUNT) {
          if (axios.isCancel(err)) {
            throw new Error(`Error during file chunk download (timeout) - ${err.message}`);
          } else {
            throw new Error(`Error during file chunk download (native) - ${err.message}`);
          }
        }

        this.emit('log', `Error during file chunk download - ${err.message}`);
        this.emit('log', `Sleep for ${RETRY_SLEEP} milliseconds and repeat`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_SLEEP));
      } finally {
        clearInterval(timer);
      }
    }

    if (strict) {
      validate(chunks, meta.checksum);
    }

    return (this.emit('log', 'All data has been downloaded'), chunks);
  }
};

function validate(chunks, checksum) {
  const hash = createHash('sha1');
  chunks.forEach((chunk) => hash.update(chunk));
  const digest = hash.digest('hex');

  if (digest !== checksum) {
    throw new Error(`Failed to verify checksum, want ${checksum}, got ${digest}`);
  }
}
