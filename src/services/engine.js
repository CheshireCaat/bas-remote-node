const { execFile } = require('child_process');
const { join, basename } = require('path');
const lock = require('proper-lockfile');
const extract = require('extract-zip');
const rimraf = require('rimraf');
const fs = require('fs');
const { request, download } = require('../utils');

const URL = 'https://bablosoft.com';

module.exports = class EngineService {
  /**
   * Create an instance of EngineService class.
   *
   * @constructor
   * @param {Object} options - remote control options object.
   */
  constructor(options) {
    this.options = options;

    this._scriptDir = join(options.workingDir, 'run', options.scriptName);
    this._engineDir = join(options.workingDir, 'engine');
  }

  /**
   * Asynchronously start the engine service with the specified port.
   * @param {Number} port - selected port number.
   *
   * @returns {Promise}
   */
  async start(port) {
    const arch = process.arch.includes('32') ? '32' : '64';

    const zipName = `FastExecuteScriptProtected.x${arch}`;
    const urlName = `FastExecuteScriptProtected${arch}`;
    const zipFile = join(this.zipDir, `${zipName}.zip`);

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
    fs.readdirSync(this._scriptDir, { withFileTypes: true }).forEach((dirent) => {
      if (dirent.isDirectory()) {
        const path = join(this._scriptDir, dirent.name);

        if (!lock.checkSync(this._getLockPath(path))) {
          rimraf.sync(path);
        }
      }
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
    return lock.unlock(this._getLockPath())
      .finally(() => {
        this._process.kill();
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
