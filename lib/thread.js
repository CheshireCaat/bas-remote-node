const { random } = require('./utils');


module.exports = class BasThread {

    /**
     * Create an instance BasThread class.
     * 
     * @constructor
     * @param {BasRemoteClient} client - Remote client object.
     */
    constructor (client) {
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
     * 
     * @returns {Promise}
     */
    async runFunction(functionName, functionParams = {}) {
        if (this._threadId && this._isRunning) {
            return Promise.reject('Another task is already running. Unable to start a new one');
        }

        if (!this._threadId) {
            this._threadId = random(1, 1000000);
            this._client.send('start_thread', {
                'thread_id': this._threadId
            })
        }

        let promise = new Promise((resolve, reject) => {
            this._client.sendAsync('run_task', {
                'params': JSON.stringify(functionParams),
                'function_name': functionName,
                'thread_id': this._threadId
            })
                .then((result) => {
                    var response = JSON.parse(result);
                    this._isRunning = false;

                    if (response.Success) {
                        resolve(response.Result);
                    } else {
                        reject(response.Message);
                    }
                });
        });

        this._isRunning = true;
        return promise;
    }

    /**
     * Immediately stops thread execution.
     */
    stop() {
        if (this._threadId) {
            this._client.send('stop_thread', {
                'thread_id': this._threadId
            });
        }

        this._isRunning = false;
        this._threadId = 0;
    }

}