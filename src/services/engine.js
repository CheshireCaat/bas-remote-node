const { execFile } = require('child_process');
const { join, basename } = require('path');
const lock = require('proper-lockfile');
const EventEmitter = require('events');
const extract = require('extract-zip');
const rimraf = require('rimraf');
const fs = require('fs');
const { request, download } = require('../utils');

module.exports = class EngineService extends EventEmitter {
  /**
   * Create an instance of EngineService class.
   *
   * @constructor
   * @param {Object} options - remote control options object.
   */
  constructor(options) {
    super();
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
    const zipFile = join(this.zipDir, `FastExecuteScriptProtected.x${ARCH}.zip`);

    if (!fs.existsSync(this.zipDir)) {
      this.emit('beforeDownload');
      fs.mkdirSync(this.zipDir, { recursive: true });
      await this._downloadExecutable(zipFile);
    }

    if (!fs.existsSync(this.exeDir)) {
      this.emit('beforeExtract');
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
  async initialize() {
    await request(`${SCRIPTS_URL}/${this.options.scriptName}/properties`)
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

    this.metadata = await request(
      `${DISTR_URL}/FastExecuteScriptProtected${ARCH}/${basename(
        this.zipDir
      )}/FastExecuteScriptProtected.x${ARCH}.zip.meta.json`
    ).then((result) => ({ url: result.Url, chunks: result.Chunks, checksum: result.Checksum }));
  }

  /**
   * Download engine executable.
   * @private
   * @returns {Promise}
   */
  _downloadExecutable(zipPath) {
    return download(this.metadata.url, zipPath);
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
      [`--remote-control-port=${port}`, '--remote-control'],
      { cwd: this.exeDir }
    );

    this._lock();
  }

  _clearRunDirectory() {
    fs.readdirSync(this._scriptDir, { withFileTypes: true }).forEach((dirent) => {
      if (dirent.isDirectory()) {
        const path = join(this._scriptDir, dirent.name);

        if (!lock.checkSync(join(path, '.lock'))) {
          rimraf.sync(path);
        }
      }
    });
  }

  _getLockPath() {
    return join(this.exeDir, '.lock');
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

const DISTR_URL = 'https://bablosoft.com/distr';

const SCRIPTS_URL = 'https://bablosoft.com/scripts';

const ARCH = process.arch.includes('32') ? '32' : '64';
