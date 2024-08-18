const path = require('path');
const { cwd } = require('process');

const BasThread = require('./thread');
const SocketService = require('./services/socket');
const EngineService = require('./services/engine');
const { once, inject, random } = require('./utils');
const DEFAULT_WORKING_DIR = path.join(cwd(), 'data');

module.exports = class BasRemoteClient {
  /**
   * Create an instance of BasRemoteClient class.
   *
   * @constructor
   * @param {Object} options - remote control options object.
   * @param {String} options.workingDir - location of the selected working folder.
   * @param {String} options.scriptName - name of the selected private script.
   * @param {String} options.password - password from a user account with access to the script.
   * @param {String} options.login - login from a user account with access to the script.
   * @param {String[]} options.args - additional arguments to be passed to the script.
   */
  constructor({ workingDir = DEFAULT_WORKING_DIR, scriptName = '', password = '', login = '', args = [] } = {}) {
    if (!workingDir) throw new Error(
      "Please define 'options.workingDir' setting"
    );

    if (!scriptName) throw new Error(
      "Please define 'options.scriptName' setting"
    );

    this.options = { scriptName, password, login, args };
    this._socket = new SocketService(this.options);
    this._engine = new EngineService(this.options);
    this.setWorkingFolder(workingDir);
    this._waitResolve = () => {};
    this._waitReject = () => {};
    this._isStarted = false;
    this._requests = {};

    this.on('messageReceived', (message) => {
      const { async, data, type, id } = message;

      if (type === 'thread_start') {
        this._waitResolve();
      } else if (type === 'message') {
        this._waitReject(new Error(data.text));
      } else if (type === 'initialize') {
        this._send('accept_resources', { '-bas-empty-script-': true });
      } else if (async && id) {
        if (type === 'get_global_variable') {
          const callback = this._requests[id];
          delete this._requests[id];
          callback(JSON.parse(data));
        } else {
          const callback = this._requests[id];
          delete this._requests[id];
          callback(data);
        }
      }
    });

    this.on('open', () => {
      this._send('remote_control_data', {
        script: this.options.scriptName,
        password: this.options.password,
        login: this.options.login,
      });
    });
  }

  /**
   * Add one-time event listener with selected name.
   *
   * Possible event names:
   *   - `messageReceived` - invoked when WebSocket receive new message.
   *   - `messageSent` - invoked when WebSocket send new message.
   *
   * Event listeners related to sending and receiving messages
   * accept a single argument `{ async, type, data, id }`.
   * @example
   * client.once('messageReceived', (message) => {
   *   console.log(`Message received: ${message.type}`));
   * });
   */
  once(event, listener) {
    this._socket.once(event, listener);
    return this;
  }

  /**
   * Add event listener with selected name.
   *
   * Possible event names:
   *   - `messageReceived` - invoked when WebSocket receive new message.
   *   - `messageSent` - invoked when WebSocket send new message.
   *
   * Event listeners related to sending and receiving messages
   * accept a single argument `{ async, type, data, id }`.
   * @example
   * client.on('messageReceived', (message) => {
   *   console.log(`Message received: ${message.type}`));
   * });
   */
  on(event, listener) {
    this._socket.on(event, listener);
    return this;
  }

  /**
   * Remove event listener with selected name.
   *
   * Possible event names:
   *   - `messageReceived` - invoked when WebSocket receive new message.
   *   - `messageSent` - invoked when WebSocket send new message.
   *
   * Event listeners related to sending and receiving messages
   * accept a single argument `{ async, type, data, id }`.
   * @example
   * const callback = (message) => {
   *   console.log(message.type);
   * });
   *
   * client.on('messageReceived', callback);
   * // any actions
   * client.off('messageReceived', callback);
   */
  off(event, listener) {
    this._socket.off(event, listener);
    return this;
  }

  /**
   * Start the client and wait for it initialize.
   * @param {Number} [timeout] - client initialization timeout (in milliseconds).
   */
  async start(timeout = 60000) {
    if (this._isStarted) return;
    await this._engine.initialize();

    const port = random(10000, 20000);

    await this._engine.start(port);
    await this._socket.start(port);

    await new Promise((resolve, reject) => {
      const id = setTimeout(() => reject(new Error('Timeout during client initialize')), timeout);

      this._waitResolve = (res) => {
        clearTimeout(id);
        resolve(res);
      };

      this._waitReject = (err) => {
        clearTimeout(id);
        reject(err);
      };
    });

    this._isStarted = true;
  }

  /**
   * Change the client and engine working folder.
   * @param {String} workingDir - location of the selected working folder.
   */
  setWorkingFolder(workingDir = DEFAULT_WORKING_DIR) {
    this._engine.setWorkingFolder(path.resolve(workingDir));
  }

  /**
   * Call the BAS function asynchronously.
   * @param {String} functionName - BAS function name as string.
   * @param {Object} functionParams - BAS function arguments list.
   * @example
   * const links = await client.runFunction('GoogleSearch', {
   *   Query: 'cats'
   * });
   *
   * links.forEach((link) => console.log(link));
   */
  runFunction(functionName, functionParams = {}) {
    if (!this._isStarted) {
      return Promise.reject(new Error('Please start the client before calling this method'));
    }

    const threadId = random(1, 1000000);

    const promise = new Promise((resolve, reject) => {
      this._startThread(threadId);
      this.sendAsync('run_task', {
        params: JSON.stringify(functionParams),
        function_name: functionName,
        thread_id: threadId,
      }).then((result) => {
        const response = JSON.parse(result);

        if (response.Success) {
          resolve(response.Result);
        } else {
          reject(new Error(response.Message));
        }

        this._stopThread(threadId);
      }).finally(
        once(this._socket, 'close', () => reject(new Error(
          'The client connection has been closed.'
        )))
      );
    });

    return inject(promise, this, threadId);
  }

  /**
   * Send the custom message and get message id as result.
   * @param {String} type - selected message type.
   * @param {Object} data - message arguments.
   * @param {Boolean} isAsync - is message async.
   * @private
   */
  _send(type, data, isAsync = false) {
    return this._socket.send({
      id: random(100000, 999999),
      async: isAsync,
      type,
      data,
    });
  }

  /**
   * Send the custom message asynchronously.
   * @param {String} type - selected message type.
   * @param {Object} data - message arguments.
   * @private
   */
  _sendAsync(type, data) {
    return new Promise((resolve) => {
      const id = this.send(type, data, true);
      this._requests[id] = resolve;
    });
  }

  /**
   * Send the custom message and get message id as result.
   * @param {String} type - selected message type.
   * @param {Object} data - message arguments.
   * @param {Boolean} isAsync - is message async.
   */
  send(type, data, isAsync = false) {
    if (!this._isStarted) throw new Error(
      'Please start the client before calling this method'
    );
    return this._send(type, data, isAsync);
  }

  /**
   * Send the custom message asynchronously.
   * @param {String} type - selected message type.
   * @param {Object} data - message arguments.
   */
  sendAsync(type, data) {
    if (!this._isStarted) {
      return Promise.reject(new Error('Please start the client before calling this method'));
    }
    return this._sendAsync(type, data);
  }

  /**
   * Start thread with specified id.
   * @param {Number} threadId - thread identifier.
   * @private
   */
  _startThread(threadId) {
    this.send('start_thread', { thread_id: threadId });
  }

  /**
   * Stop thread with specified id.
   * @param {Number} threadId - thread identifier.
   * @private
   */
  _stopThread(threadId) {
    this.send('stop_thread', { thread_id: threadId });
  }

  /**
   * Create new BAS thread object.
   */
  createThread() {
    return new BasThread(this);
  }

  /**
   * Close the client.
   */
  async close() {
    await Promise.all([
      this._engine.close(),
      this._socket.close(),
    ]);
    this._isStarted = false;
  }
};
