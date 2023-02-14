const { once, random } = require('./utils');

module.exports = class BasThread {
  /**
   * Create an instance BasThread class.
   *
   * @constructor
   * @param {BasRemoteClient} client - remote client object.
   */
  constructor(client) {
    this._client = client;

    this._isRunning = false;
    this._threadId = 0;
  }

  /**
   * Check if thread is already busy with running function.
   *
   * @returns {Boolean}
   */
  get isRunning() {
    return this._isRunning;
  }

  /**
   * Gets current thread id.
   *
   * @returns {Number}
   */
  get threadId() {
    return this._threadId;
  }

  /**
   * Call the BAS function asynchronously.
   * @param {String} functionName - BAS function name as string.
   * @param {Object} functionParams - BAS function arguments list.
   * @example
   * thread.runFunction('GoogleSearch', { Query: 'cats' })
   *      .then((links) => {
   *          links.forEach((link) => {
   *              console.log(link);
   *          });
   *      });
   */
  runFunction(functionName, functionParams = {}) {
    if (this._threadId && this._isRunning) {
      return Promise.reject(new Error('Another task is already running. Unable to start a new one'));
    }

    if (!this._threadId) {
      this._threadId = random(1, 1000000);
      this._client._startThread(this._threadId);
    }

    const promise = new Promise((resolve, reject) => {
      this._client.sendAsync('run_task', {
        params: JSON.stringify(functionParams),
        function_name: functionName,
        thread_id: this._threadId,
      }).then((result) => {
        const response = JSON.parse(result);
        this._isRunning = false;

        if (response.Success) {
          resolve(response.Result);
        } else {
          reject(new Error(response.Message));
        }
      }).finally(
        once(this._client, 'close', () => reject(new Error(
          'The client connection has been closed.'
        )))
      );
    });

    this._isRunning = true;
    return promise;
  }

  /**
   * Immediately stops thread execution.
   */
  stop() {
    if (this._threadId) {
      this._client._stopThread(this._threadId);
    }

    this._isRunning = false;
    this._threadId = 0;
  }
};
