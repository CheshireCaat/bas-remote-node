const path = require('path');
const { inject, random, throwIf } = require('./utils');
const SocketService = require('./services/socket');
const EngineService = require('./services/engine');
const defaultOptions = require('./options');
const BasThread = require('./thread');

module.exports = class BasRemoteClient {
    /**
     * Create an instance of BasRemoteClient class.
     *
     * @constructor
     * @param {Options} options - Remote control options object.
     */
    constructor(options) {
        this.options = Object.assign({}, defaultOptions, options);

        throwIf(!this.options.workingDir,
            "Please define 'options.workingDir' setting"
        );

        throwIf(!this.options.scriptName,
            "Please define 'options.scriptName' setting"
        );

        this.options.workingDir = path.resolve(this.options.workingDir);
        this._socket = new SocketService(this.options);
        this._engine = new EngineService(this.options);
        this._waitResolve = () => { };
        this._waitReject = () => { };
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
                    (callback)(JSON.parse(data));
                } else {
                    const callback = this._requests[id];
                    delete this._requests[id];
                    (callback)(data);
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
    * Listener accepts single argument `{data, type, async, id}`.
    *
    * Possible event names:
    *   - `messageReceived` - invoked when WebSocket receive new message.
    *   - `messageSent` - invoked when WebSocket send new message.
    *
    * @example
    * client.once('messageReceived', (msg) => {
    *   console.log(`Message received: ${msg.type}`));
    * }
    *
    * @returns {BasRemoteClient}
    */
    once(event, listener) {
        this._socket.once(event, listener);
        return this;
    }

    /**
    * Add event listener with selected name.
    * Listener accepts single argument `{data, type, async, id}`.
    *
    * Possible event names:
    *   - `messageReceived` - invoked when WebSocket receive new message.
    *   - `messageSent` - invoked when WebSocket send new message.
    *
    * @example
    * client.on('messageReceived', (msg) => {
    *   console.log(`Message received: ${msg.type}`));
    * }
    *
    * @returns {BasRemoteClient}
    */
    on(event, listener) {
        this._socket.on(event, listener);
        return this;
    }

    /**
    * Remove event listener with selected name.
    * Listener accepts single argument `{data, type, async, id}`.
    *
    * Possible event names:
    *   - `messageReceived` - invoked when WebSocket receive new message.
    *   - `messageSent` - invoked when WebSocket send new message.
    *
    * @example
    * const callback = (msg) => {
    *   console.log(msg.type);
    * }
    *
    * client.on('messageReceived', callback);
    * // any actions
    * client.off('messageReceived', callback);
    *
    * @returns {BasRemoteClient}
    */
    off(event, listener) {
        this._socket.off(event, listener);
        return this;
    }

    /**
     * Start the client and wait for it initialize.
     *
     * @returns {Promise}
     */
    async start() {
        await this._engine.initialize();

        const port = random(10000, 20000);

        await this._engine.start(port);
        await this._socket.start(port);

        return new Promise((resolve, reject) => {
            const id = setTimeout(() => reject(new Error('Timeout during client initialize')), this.options.timeout || 60000);

            this._waitReject = (err) => {
                this._isStarted = false;
                clearTimeout(id);
                reject(err);
            };

            this._waitResolve = () => {
                this._isStarted = true;
                clearTimeout(id);
                resolve();
            };
        });
    }

    /**
     * Call the BAS function asynchronously.
     * @param {String} functionName - BAS function name as string.
     * @param {Object} functionParams - BAS function arguments list.
     * @example
     * client.runFunction('GoogleSearch', { Query: 'cats' })
     *      .then((links) => {
     *          links.forEach((link) => {
     *              console.log(link);
     *          });
     *      });
     * @returns {Promise}
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

                if (!response.Success) {
                    reject(new Error(response.Message));
                } else {
                    resolve(response.Result);
                }

                this._stopThread(threadId);
            });
        });

        return inject(promise, this, threadId);
    }

    /**
     * Send the custom message and get message id as result.
     * @param {String} type - Selected message type.
     * @param {Object} data - Message arguments.
     * @param {Boolean} isAsync - Is message async.
     * @private
     * @returns {Number}
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
     * @param {String} type - Selected message type.
     * @param {Object} data - Message arguments.
     * @private
     * @returns {Promise}
     */
    _sendAsync(type, data) {
        return new Promise((resolve) => {
            const id = this.send(type, data, true);
            this._requests[id] = resolve;
        });
    }

    /**
     * Send the custom message and get message id as result.
     * @param {String} type - Selected message type.
     * @param {Object} data - Message arguments.
     * @param {Boolean} isAsync - Is message async.
     *
     * @returns {Number}
     */
    send(type, data, isAsync = false) {
        throwIf(!this._isStarted,
            'Please start the client before calling this method'
        );
        return this._send(type, data, isAsync);
    }

    /**
     * Send the custom message asynchronously.
     * @param {String} type - Selected message type.
     * @param {Object} data - Message arguments.
     *
     * @returns {Promise}
     */
    sendAsync(type, data) {
        if (!this._isStarted) {
            return Promise.reject(new Error('Please start the client before calling this method'));
        }
        return this._sendAsync(type, data);
    }

    /**
     * Start thread with specified id.
     * @param {Number} threadId - Thread identifier.
     * @private
     */
    _startThread(threadId) {
        this.send('start_thread', { thread_id: threadId });
    }

    /**
     * Stop thread with specified id.
     * @param {Number} threadId - Thread identifier.
     * @private
     */
    _stopThread(threadId) {
        this.send('stop_thread', { thread_id: threadId });
    }

    /**
     * Create new BAS thread object.
     *
     * @returns {BasThread}
     */
    createThread() {
        return new BasThread(this);
    }

    /**
     * [description]
     * @returns {Promise}
     */
    close() {
        return Promise.all([
            this._engine.close(),
            this._socket.close(),
        ]);
    }
};
