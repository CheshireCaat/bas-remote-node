const request = require('request-promise-native'),
    execFile = require('child_process').execFile,
    unzip = require('unzipper'),
    path = require('path'),
    fs = require('fs'),
    os = require('os');

/**
 * Service that provides methods for interacting with BAS engine.
 */
class EngineService {

    /**
     * Create an instance of EngineService class.
     * 
     * @constructor
     * @param {Object} options - Remote control options object.
     */
    constructor (options) {
        this.options = options;

        this.scriptDir = path.join(options.workingDir, "run", options.scriptName);
        this.engineDir = path.join(options.workingDir, "engine");

        this.request = request.defaults({ baseUrl: 'https://bablosoft.com' });
    }

    /**
     * Asynchronously start the engine service with the specified port.
     * @param {Number} port - Selected port number.
     */
    async start(port) {
        const { zipName, urlName } = getNames();

        const zipPath = path.join(this.zipDir, `${zipName}.zip`);

        if (!fs.existsSync(this.zipDir)) {
            fs.mkdirSync(this.zipDir, { recursive: true });
            await this._downloadExecutable(zipPath, zipName, urlName);
        }

        if (!fs.existsSync(this.exeDir)) {
            fs.mkdirSync(this.exeDir, { recursive: true });
            await this._extractExecutable(zipPath);
        }

        this._runEngineProcess(port);
    }

    /**
     * 
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            this.request(`/scripts/${this.options.scriptName}/properties`, { json: true })
                .then(data => {
                    if (!data.success) {
                        return reject('Script with selected name not exist');
                    }

                    if (!supported(data.engversion)) {
                        return reject('Script engine not supported (Required 22.4.2 or newer)');
                    }

                    this.exeDir = path.join(this.scriptDir, data.hash.slice(0, 5));
                    this.zipDir = path.join(this.engineDir, data.engversion);
                    resolve();
                });
        });
    }

    /**
     * Download executable and save it to the specified zip archive.
     * 
     * @param {String} zipPath - path to zip archive file. 
     * @param {String} zipName 
     * @param {String} urlName 
     * 
     * @returns {Promise} promise object.
     */
    async _downloadExecutable(zipPath, zipName, urlName) {
        return new Promise((resolve) => {
            this.request(`/distr/${urlName}/${path.basename(this.zipDir)}/${zipName}.zip`, { encoding: null })
                .then(data => {
                    let buffer = Buffer.from(data, 'utf8');
                    fs.writeFileSync(zipPath, buffer);
                    resolve();
                });
        })
    }

    /**
     * Extract executable from the specified zip archive to directory.
     * 
     * @param {String} zipPath - path to zip archive file.
     * 
     * @returns {Promise} promise object.
     */
    async _extractExecutable(zipPath) {
        return new Promise((resolve) => {
            unzip.Open.file(zipPath)
                .then(zip => {
                    zip.extract({ path: this.exeDir }).then(resolve);
                });
        })
    }

    _runEngineProcess(port) {
        let args = [`--remote-control`, `--remote-control-port=${port}`];
        let file = path.join(this.exeDir, 'FastExecuteScript.exe');
        this._process = execFile(file, args, { cwd: this.exeDir });
    }

    close() {
        this._process.kill('SIGINT');
    }
}

function getNames() {
    let arch = os.arch().substr(1, 2);

    let zipName = `FastExecuteScriptProtected.x${arch}`;
    let urlName = `FastExecuteScriptProtected${arch}`;
    return { zipName, urlName };
}

function supported(actual) {
    let minimal = '22.4.2';

    let v1 = minimal.split('.').map(Number);
    let v2 = actual.split('.').map(Number);

    return v1.every((value, index) => value <= v2[index]);
}

module.exports = EngineService;