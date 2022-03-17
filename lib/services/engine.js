const { join, dirname, basename } = require('path');
const { execFile } = require('child_process');
const lock = require('proper-lockfile');
const extract = require('extract-zip');
const fs = require('fs');
const { rmdirRecursive, mkdirRecursive } = require('../utils');
const { request, download } = require('../utils');

const URL = 'https://bablosoft.com';

module.exports = class EngineService {
    /**
     * Create an instance of EngineService class.
     *
     * @constructor
     * @param {Object} options - Remote control options object.
     */
    constructor(options) {
        this.options = options;

        this._scriptDir = join(options.workingDir, 'run', options.scriptName);
        this._engineDir = join(options.workingDir, 'engine');
    }

    /**
     * Asynchronously start the engine service with the specified port.
     * @param {Number} port - Selected port number.
     *
     * @returns {Promise}
     */
    async start(port) {
        const arch = process.arch.substr(1, 2);

        const zipName = `FastExecuteScriptProtected.x${arch}`;
        const urlName = `FastExecuteScriptProtected${arch}`;
        const zipFile = join(this.zipDir, `${zipName}.zip`);

        if (!fs.existsSync(this.zipDir)) {
            mkdirRecursive(this.zipDir);
            await this._downloadExecutable(zipFile, zipName, urlName);
        }

        if (!fs.existsSync(this.exeDir)) {
            mkdirRecursive(this.exeDir);
            await this._extractExecutable(zipFile);
        }

        this._runEngineProcess(port);
        this._clearRunDirectory();
    }

    /**
     *
     * @returns {Promise}
     */
    initialize() {
        return request(`${URL}/scripts/${this.options.scriptName}/properties`)
            .then((data) => {
                if (!data.success) {
                    throw new Error('Script with selected name not exist');
                }

                if (!supported(data.engversion)) {
                    throw new Error('Script engine not supported (Required 22.4.2 or newer)');
                }

                return data;
            })
            .then((data) => {
                this.exeDir = join(this._scriptDir, data.hash.slice(0, 5));
                this.zipDir = join(this._engineDir, data.engversion);
            });
    }

    /**
     * Download engine executable.
     * @private
     * @returns {Promise}
     */
    _downloadExecutable(zipPath, zipName, urlName) {
        return download(`${URL}/distr/${urlName}/${basename(this.zipDir)}/${zipName}.zip`, zipPath);
    }

    /**
     * Extract engine executable.
     * @private
     * @returns {Promise}
     */
    _extractExecutable(zipPath) {
        return extract(zipPath, { dir: this.exeDir });
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

        this._lock();
    }

    _clearRunDirectory() {
        fs.readdirSync(this._scriptDir)
            .map((path) => join(this._scriptDir, path))
            .filter((path) => fs.lstatSync(path).isDirectory())
            .map((path) => this._getLockPath(path))
            .filter((path) => !lock.checkSync(path))
            .forEach((path) => {
                rmdirRecursive(dirname(path));
            });
    }

    _getLockPath(path) {
        return join(path || this.exeDir, '.lock');
    }

    _lock() {
        try {
            fs.writeFileSync(this._getLockPath(), '');
            lock.lockSync(this._getLockPath());
        } catch (error) {
            // ignore
        }
    }

    /**
     * [description]
     * @returns {Promise}
     */
    close() {
        const killProcess = () => this._process.kill('SIGINT');
        return lock.unlock(this._getLockPath())
            .then(() => {
                killProcess();
            })
            .catch(() => {
                killProcess();
            });
    }
};

const supported = (actual) => {
    const minimal = '22.4.2';

    const [majorA, minorA, patchA] = actual.split('.').map(Number);
    const [majorB, minorB, patchB] = minimal.split('.').map(Number);

    if (majorA !== majorB) {
        return majorA > majorB;
    }

    if (minorA !== minorB) {
        return minorA > minorB;
    }

    return patchA >= patchB;
};
