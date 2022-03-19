const { createHash } = require('crypto');
const axios = require('axios').default;

const DOWNLOAD_TIMEOUT = 1200000;
const DEFAULT_TIMEOUT = 10000;
const CHUNK_SIZE = 10485760;
const RETRY_SLEEP = 2000;
const RETRY_COUNT = 30;

module.exports = class ScriptDownloader {
  constructor() {
    this.strict = false;
    this.meta = {};
  }

  async get(url) {
    [this.strict, this.meta] = [false, { url }];

    try {
      const { data } = await axios.get(`${url}.meta.json`, { timeout: DEFAULT_TIMEOUT });

      if (typeof data === 'object' && ['TotalSize', 'Checksum', 'Chunks', 'Url'].every((key) => key in data)) {
        this.meta = {
          url: data.Url,
          chunks: data.Chunks,
          checksum: data.Checksum,
          totalSize: Number(data.TotalSize),
        };
        this.strict = true;
      } else {
        this.strict = false;
      }
    } catch (err) {
      if (err.isAxiosError) {
        throw new Error(`Error during meta file download (axios) - ${err.message}`);
      } else {
        throw new Error(`Error during meta file download (native) - ${err.message}`);
      }
    }

    if (!this.strict) {
      try {
        const { headers } = await axios.get(url, {
          timeout: DEFAULT_TIMEOUT,
          headers: { Range: 'bytes=0-0' },
        });

        if (headers['content-range']) {
          const size = Number(headers['content-range'].split('/').at(1));

          if (size) {
            this.meta.totalSize = size;
          } else {
            throw new Error('Range header is invalid');
          }
        } else {
          throw new Error('Range header is missing');
        }
      } catch (err) {
        if (err.isAxiosError) {
          throw new Error(`Error during file size retrieval (axios) - ${err.message}`);
        } else {
          throw new Error(`Error during file size retrieval (native) - ${err.message}`);
        }
      }
    }

    return Buffer.concat(await this.download());
  }

  async download() {
    const chunks = [];
    let attempt = 0;
    let offset = 0;
    let index = 0;

    while (offset < this.meta.totalSize) {
      try {
        const { data } = await axios.get(this.meta.url, {
          responseType: 'arraybuffer',
          timeout: DOWNLOAD_TIMEOUT,
          headers: { Range: `bytes=${offset}-${offset + CHUNK_SIZE - 1}` },
        });

        if (this.strict) {
          const actualHash = createHash('sha1').update(data).digest('hex');
          const expectedHash = this.meta.chunks[index];

          if (actualHash !== expectedHash) {
            throw new Error(`Failed to verify checksum, want ${expectedHash}, got ${actualHash}`);
          }
        }

        offset += CHUNK_SIZE;
        chunks.push(data);
        index += 1;
      } catch (err) {
        if (++attempt > RETRY_COUNT) {
          if (err.isAxiosError) {
            throw new Error(`Error during file chunk download (axios) - ${err.message}`);
          } else {
            throw new Error(`Error during file chunk download (native) - ${err.message}`);
          }
        }

        await new Promise((resolve) => setTimeout(resolve, RETRY_SLEEP));
      }
    }

    if (this.strict) {
      const hash = createHash('sha1');

      chunks.forEach((chunk) => hash.update(chunk));

      const actualHash = hash.digest('hex');
      const expectedHash = this.meta.checksum;

      if (actualHash !== expectedHash) {
        throw new Error(`Failed to verify checksum, want ${expectedHash}, got ${actualHash}`);
      }
    }

    return chunks;
  }
};
