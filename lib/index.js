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
    constructor (options) {
        this.options = Object.assign({}, defaultOptions, options);

        this._assertOptionsWorkingDir();
        this._assertOptionsScriptName();

        this._socket = new SocketService(this.options);
        this._engine = new EngineService(this.options);
        this._waitResolve = () => { };
        this._waitReject = () => { };
        this._requests = {};

        this.onMessageReceived.addListener((message) => {
            let { async, data, type, id } = message;

            if (type == 'thread_start') {
                this._waitResolve();
            } else if (type == 'message') {
                this._waitReject(new Error(data['text']));
            } else if (type == 'initialize') {
                this.send('accept_resources', { '-bas-empty-script-': true });
            } else if (async && id) {
                if (type == 'get_global_variable') {
                    let func = this._requests[id];
                    delete this._requests[id];
                    (func)(JSON.parse(data));
                } else {
                    let func = this._requests[id];
                    delete this._requests[id];
                    (func)(data);
                }
            }
        });

        this._socket.onOpen.addListener(() => {
            this.send('remote_control_data', {
                'script': this.options.scriptName,
                'password': this.options.password,
                'login': this.options.login
            });
        });
    }

    /**
    * Event channel triggered when message received.
    * Listener accepts single argument `{data, type, async, id}`.
    *
    * @see https://vitalets.github.io/chnl/#channel
    * @example
    * client.onMessageReceived.addListener(msg => {
    *   console.log(`Message received: ${msg.type}`));
    * }
    * @returns {Channel}
    */
    get onMessageReceived() {
        return this._socket.onMessageReceived;
    }

    /**
    * Event channel triggered when message sent.
    * Listener accepts single argument `{data, type, async, id}`.
    *
    * @see https://vitalets.github.io/chnl/#channel
    * @example
    * client.onMessageSent.addListener(msg => {
    *   console.log(`Message sent: ${msg.type}`));
    * }
    * @returns {Channel}
    */
    get onMessageSent() {
        return this._socket.onMessageSent;
    }

    /**
     * Start the client and wait for it initialize.
     *
     * @returns {Promise}
     */
    async start() {
        await this._engine.initialize();

        let port = random(10000, 20000);

        await this._engine.start(port);
        await this._socket.start(port);

        return new Promise((resolve, reject) => {
            let id = setTimeout(() => reject(new Error('Timeout during client initialize')), 60000);

            this._waitResolve = (obj) => {
                clearTimeout(id);
                resolve(obj);
            };

            this._waitReject = (err) => {
                clearTimeout(id);
                reject(err);
            };
        });
    }

    /**
     * Call the BAS function asynchronously.
     * @param {String} functionName - BAS function name as string.
     * @param {Object} functionParams - BAS function arguments list.
     *
     * @returns {Promise}
     */
    async runFunction(functionName, functionParams = {}) {
        const threadId = random(1, 1000000);

        const promise = new Promise((resolve, reject) => {
            this._startThread(threadId);
            this.sendAsync('run_task', {
                'params': JSON.stringify(functionParams),
                'function_name': functionName,
                'thread_id': threadId
            })
                .then((result) => {
                    let response = JSON.parse(result);

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
     * @param {Boolean} is_async - Is message async.
     *
     * @returns {Number}
     */
    send(type, data, is_async = false) {
        return this._socket.send({
            'id': random(100000, 999999),
            'async': is_async,
            'type': type,
            'data': data
        });
    }

    /**
     * Send the custom message asynchronously.
     * @param {String} type - Selected message type.
     * @param {Object} data - Message arguments.
     *
     * @returns {Promise}
     */
    sendAsync(type, data) {
        return new Promise((resolve) => {
            const id = this.send(type, data, true);
            this._requests[id] = resolve;
        });
    }

    _assertOptionsWorkingDir() {
        throwIf(!this.options.workingDir,
            'Please define \'options.workingDir\''
        );
    }

    _assertOptionsScriptName() {
        throwIf(!this.options.scriptName,
            'Please define \'options.scriptName\''
        );
    }

    /**
     * Start thread with specified id.
     * @param {Number} threadId - Thread identifier.
     */
    _startThread(threadId) {
        this.send('start_thread', {
            'thread_id': threadId
        });
    }

    /**
     * Stop thread with specified id.
     * @param {Number} threadId - Thread identifier.
     */
    _stopThread(threadId) {
        this.send('stop_thread', {
            'thread_id': threadId
        });
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
    async close() {
        return Promise.all([ 
            this._engine.close(),
            this._socket.close()
        ]);
    }
};
