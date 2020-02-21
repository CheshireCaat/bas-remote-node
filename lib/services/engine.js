const { join, dirname, basename } = require('path');
const request = require('request-promise-native');
const { execFile } = require('child_process');
const lockFile = require('proper-lockfile');
const unzip = require('unzipper');
const os = require('os');
const fs = require('fs');

module.exports = class EngineService {

    /**
     * Create an instance of EngineService class.
     * 
     * @constructor
     * @param {Object} options - Remote control options object.
     */
    constructor (options) {
        this.options = options;

        this._scriptDir = join(options.workingDir, 'run', options.scriptName);
        this._engineDir = join(options.workingDir, 'engine');
        
        this._request = request.defaults({ 
            baseUrl: 'https://bablosoft.com' 
        });
    }

    /**
     * Asynchronously start the engine service with the specified port.
     * @param {Number} port - Selected port number.
     * 
     * @returns {Promise}
     */
    async start(port) {
        const { zipName, urlName, zipFile } = getNames(this.zipDir);

        if (!fs.existsSync(this.zipDir)) {
            fs.mkdirSync(this.zipDir, { recursive: true });
            await this._downloadExecutable(zipFile, zipName, urlName);
        }

        if (!fs.existsSync(this.exeDir)) {
            fs.mkdirSync(this.exeDir, { recursive: true });
            await this._extractExecutable(zipFile);
        }

        this._runEngineProcess(port);
        this._clearRunDirectory();
    }

    /**
     * 
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            this._request(`/scripts/${this.options.scriptName}/properties`, { json: true })
                .then(data => {
                    if (!data.success) {
                        return reject(new Error('Script with selected name not exist'));
                    }

                    if (!supported(data.engversion)) {
                        return reject(new Error('Script engine not supported (Required 22.4.2 or newer)'));
                    }

                    this.exeDir = join(this._scriptDir, data.hash.slice(0, 5));
                    this.zipDir = join(this._engineDir, data.engversion);
                    resolve();
                });
        });
    }

    async _downloadExecutable(zipPath, zipName, urlName) {
        return new Promise((resolve, reject) => {
            this._request(`/distr/${urlName}/${basename(this.zipDir)}/${zipName}.zip`, { encoding: null })
                .then(data => {
                    const buffer = Buffer.from(data, 'utf8');
                    fs.writeFile(zipPath, buffer, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
        })
    }

    async _extractExecutable(zipPath) {
        return new Promise((resolve, reject) => {
            unzip.Open.file(zipPath)
                .then(async (zip) => {
                    await zip.extract({ path: this.exeDir })
                })
                .then(resolve)
                .catch(reject);
        })
    }

    _runEngineProcess(port) {
        this._process = execFile(
            join(this.exeDir, 'FastExecuteScript.exe'), 
            [
                `--remote-control-port=${port}`,
                '--remote-control'
            ], 
            { cwd: this.exeDir }
        );

        fs.writeFileSync(this._getLockPath(), '');
        lockFile.lockSync(this._getLockPath());
    }

    _clearRunDirectory() {
        fs.readdirSync(this._scriptDir)
            .map(path => join(this._scriptDir, path))
            .filter(path => fs.lstatSync(path).isDirectory())
            .map(path => this._getLockPath(path))
            .filter(path => lockFile.check(path))
            .forEach(path => {
                fs.rmdirSync(basename(dirname(path)), { recursive: true});
            });
    }

    _getLockPath(dir) {
        return join(dir ? dir: this.exeDir, '.lock');
    }

    /**
     * [description]
     * @returns {Promise}
     */
    async close() {
        return lockFile.unlock(this._getLockPath())
            .then(() => {
                this._process.kill('SIGINT');
            })
            .catch(() => {
                this._process.kill('SIGINT');
            });
    }
}

const getNames = (dir) => {
    const arch = os.arch().substr(1, 2);

    const zipName = `FastExecuteScriptProtected.x${arch}`;
    const urlName = `FastExecuteScriptProtected${arch}`;
    const zipFile = join(dir, `${zipName}.zip`);
    return { zipName, urlName, zipFile };
}

const supported = (actual) => {
    const minimal = '22.4.2';

    const v1 = minimal.split('.').map(Number);
    const v2 = actual.split('.').map(Number);

    return v1.every((value, index) => value <= v2[index]);
}