const log = require('debug')('bas-remote');
const axios = require('axios').default;
const crypto = require('crypto');

const has = Object.prototype.hasOwnProperty;

const DOWNLOAD_TIMEOUT = 1200000;
const DEFAULT_TIMEOUT = 10000;
const CHUNK_SIZE = 10485760;
const RETRY_SLEEP = 2000;
const RETRY_COUNT = 30;

class ScriptDownloader {
    strict = false;

    chunks = [];

    attempt = 0;

    offset = 0;

    index = 0;

    meta = {};

    async get(url) {
        [this.strict, this.chunks, this.meta] = [false, [], { url }];
        log(`Downloading meta ${url}.meta.json`);

        try {
            const { data } = await axios.get(`${url}.meta.json`, { timeout: DEFAULT_TIMEOUT });

            if (typeof data === 'object' && ['TotalSize', 'Checksum', 'Chunks', 'Url'].every(key => has.call(data, key))) {
                this.meta = {
                    totalSize: parseInt(data['TotalSize']),
                    checksum: data['Checksum'],
                    chunks: data['Chunks'],
                    url: data['Url'],
                };
                log('Valid meta format - enable strict mode');
                this.strict = true;
            } else {
                log('Wrong meta format - disable strict mode');
                this.strict = false;
            }
        } catch (e) {
            if (!e.isAxiosError) {
                log(`Error while downloading meta file (native) - ${e.message}`);
            } else {
                log(`Error while downloading meta file (axios) - ${e.message}`);
            }
        }

        if (this.strict) {
            this.index = 0;
            await this.nextChunk();
        } else {
            log('Trying to get file size');
            try {
                const { headers } = await axios.get(url, {
                    timeout: DEFAULT_TIMEOUT,
                    headers: {
                        Range: 'bytes=0-0'
                    },
                });

                if (headers['content-range']) {
                    const size = parseInt(headers['content-range'].split('/').at(1));

                    if (size) {
                        log(`Obtained file size - ${size}`);
                        this.meta.totalSize = size;
                        this.index = 0;
                        await this.nextChunk();
                    } else {
                        log('Failed to get file size with error - range header is invalid');
                    }
                } else {
                    log('Failed to get file size with error - range header is empty');
                }
            } catch (e) {
                log(`Failed to get file size with error - ${e}`);
            }
        }

        return Buffer.concat(this.chunks);
    }

    async nextChunk() {
        if (this.offset >= this.meta.totalSize) {
            let isSuccess = true, error;

            if (this.strict) {
                const hash = crypto.createHash('sha1');

                this.chunks.forEach(chunk => hash.update(chunk));

                const actualHash = hash.digest('hex');
                const expectedHash = this.meta.checksum;

                if (actualHash != expectedHash) {
                    error = `Failed to verify checksum, want ${expectedHash}, got ${actualHash}`;
                    isSuccess = false;
                }
            }

            return log(isSuccess ? 'All data has been downloaded' : error);
        }

        this.attempt = 0;
        await this.downloadNextChunk();
    }

    async downloadNextChunk() {
        log(`Start download chunk - ${this.offset}`);

        let isSuccess = false, error;

        try {
            const { data } = await axios.get(this.meta.url, {
                responseType: 'arraybuffer',
                timeout: DOWNLOAD_TIMEOUT,
                headers: {
                    Range: `bytes=${this.offset}-${this.offset + CHUNK_SIZE - 1}`
                },
            });

            if (this.strict) {
                const actualHash = crypto.createHash('sha1').update(data).digest('hex');
                const expectedHash = this.meta.chunks[this.index];

                if (actualHash != expectedHash) {
                    error = `Failed to verify checksum, want ${expectedHash}, got ${actualHash}`;
                    isSuccess = false;
                } else {
                    isSuccess = true;
                }
            } else {
                isSuccess = true;
            }

            this.chunks.push(data);
        } catch (e) {
            error = e;
        }

        if (isSuccess) {
            log('Chunk downlad success');

            this.offset += CHUNK_SIZE;
            this.index += 1;
            await this.nextChunk();
        } else {
            if (++this.attempt > RETRY_COUNT) {
                log('Too much fails, stop');
                return;
            }

            log(`Finish download next chunk with error - ${error}`);
            await new Promise(resolve => setTimeout(resolve, RETRY_SLEEP));

            await this.downloadNextChunk();
        }
    }
}

async function main() {
    const fs = require('fs/promises');
    const worker = new ScriptDownloader();

    const buffer = await worker.get(
        'https://bablosoft.com/distr/FastExecuteScriptProtected64/24.3.1/FastExecuteScriptProtected.x64.zip'
    );

    await fs.writeFile('./Script.zip', buffer);
}

main();