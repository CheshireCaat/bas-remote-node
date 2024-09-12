const Cache = require('file-system-cache').default;
const { pipeline } = require('stream/promises');
const { execFile } = require('child_process');
const { join } = require('path');
const { createHash } = require('crypto');
const lock = require('proper-lockfile');
const EventEmitter = require('events');
const extract = require('extract-zip');
const { rimraf } = require('rimraf');
const os = require('os');
const fs = require('fs');
const { request, download } = require('./utils');
const { InvalidEngineError } = require('./errors');

const cache = Cache({
  ttl: 60 * 10, // 10 minutes
  basePath: join(os.tmpdir(), 'BasRemoteCache'),
});

module.exports = class EngineService extends EventEmitter {
  /**
   * Create an instance of the `EngineService` class.
   *
   * @param {any} options - remote control options object.
   * @constructor
   */
  constructor(options) {
    super();
    this.options = options;
  }

  /**
   * Asynchronously start the engine service with the specified port.
   *
   * @param {number} port - selected port number.
   */
  async start(port) {
    const zipFile = join(this.zipDir, `FastExecuteScriptProtected.x${ARCH}.zip`);

    if (this.metadata && fs.existsSync(zipFile)) {
      if (this.metadata.checksum !== (await checksum(zipFile))) {
        fs.rmSync(this.zipDir, { recursive: true });
      }
    }

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
    const data = await fetch(`${SCRIPTS_URL}/${this.options.scriptName}/properties`);

    if (!data.success) {
      throw new Error('Script with selected name not exist');
    }

    if (!supported(data.engversion)) {
      throw new Error('Script engine not supported (Required 22.4.2 or newer)');
    }

    this.exeDir = join(this._scriptDir, data.hash.slice(0, 5));
    this.zipDir = join(this._engineDir, data.engversion);

    this.metadata = await fetch(
      `${DISTR_URL}/FastExecuteScriptProtected${ARCH}/${data.engversion}/FastExecuteScriptProtected.x${ARCH}.zip.meta.json`
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

  setWorkingFolder(folder) {
    this._scriptDir = join(folder, 'run', this.options.scriptName);
    this._engineDir = this.options.enginesDir || join(folder, 'engine');
  }

  _runEngineProcess(port) {
    this._process = execFile(
      join(this.exeDir, 'FastExecuteScript.exe'),
      [`--remote-control-port=${port}`, '--remote-control', ...this.options.args],
      { cwd: this.exeDir },
      (error) => {
        if (error && error.code && error.code > 1) {
          throw new InvalidEngineError(`Unable to start engine process (code: ${error.code})`);
        }
      }
    );

    this._lock();
  }

  _clearRunDirectory() {
    if (!fs.existsSync(this._scriptDir)) return;
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
  async close() {
    if (!this._process) return;
    try {
      await lock.unlock(this._getLockPath());
    } catch {
      // suppress lock error
    } finally {
      this._process.kill();
    }
  }
};

const checksum = async (file) => {
  const input = fs.createReadStream(file);
  const hash = createHash('sha1');
  await pipeline(input, hash);
  return hash.digest('hex');
};

const fetch = async (url) => {
  try {
    const cached = await cache.get(url);
    return JSON.parse(cached);
  } catch {
    // Ignore if not cached and proceed to fetch
  }
  const response = await request(url);
  await cache.set(url, JSON.stringify(response));
  return response;
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
