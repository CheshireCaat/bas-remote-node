const AuthenticationError = require('./errors/AuthenticationError');
const TimeoutError = require('./errors/TimeoutError');
const { random } = require('./helpers');
const SocketService = require('./services/socket_service');
const EngineService = require('./services/engine_service');
const Options = require('./options');
const Thread = require('./thread');

const Channel = require('chnl');

class BasRemoteClient {

    /**
     * Create an instance of BasRemoteClient class.
     * 
     * @constructor
     * @param {Options} options - Remote control options object.
     */
    constructor (options) {
        let clientOptions = Object.assign({}, Options, options);

        this._socket = new SocketService(clientOptions);
        this._engine = new EngineService(clientOptions);
        this._waitResolve = () => { };
        this._waitReject = () => { };
        this._requests = {};

        this.onMessageReceived.addListener(message => {
            let { async, data, type, id } = message;

            if (type == 'thread_start') {
                this._waitResolve();
            }
            if (type = 'initialize') {
                this.send('accept_resources', { '-bas-empty-script-': true });
            }
            if (type = 'message') {
                this._waitReject(new AuthenticationError(data.text));
            }
            if (async && id) {
                if (type == 'get_global_variable') {
                    var func = this._requests[id];
                    delete this._requests[id];
                    (func)(JSON.parse(data))
                } else {
                    var func = this._requests[id];
                    delete this._requests[id];
                    (func)(data)
                }
            }
        });
    }

    /**
    * Event channel triggered when message received.
    * Listener accepts single argument `{data, type, async, id}`.
    *
    * @see https://vitalets.github.io/chnl/#channel
    * @example
    * client.onMessageReceived.addListener(msg=> console.log(`Message received: ${msg.type}`));
    *
    * @returns {Channel} channel object.
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
    * client.onMessageSent.addListener(msg => console.log(`Message sent: ${msg.type}`));
    *
    * @returns {Channel} channel object.
    */
    get onMessageSent() {
        return this._socket.onMessageSent;
    }

    /**
     * Start the client and wait for it initialize.
     * 
     * @returns {Promise} promise object.
     */
    async start() {
        await this._engine.initialize();

        let port = random(10000, 20000);

        await this._engine.start(port);
        await this._socket.start(port);

        return new Promise((resolve, reject) => {
            let id = setTimeout(() => reject(new TimeoutError()), 60000);

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
     * 
     * @param {*} functionName 
     * @param {*} functionParams 
     */
    async runFunction(functionName, functionParams) {

    }

    send(type, data, async = false) {
        return this._socket.send(type, data, async);
    }

    sendAsync(type, data) {
        return new Promise(resolve => {
            let id = self.send(type, data, true);
            this._requests[id] = resolve;
        });
    }

    createThread() {
        return new Thread(this);
    }

    close() {
        this._engine.close();
        this._socket.close();
    }
}

module.exports = BasRemoteClient;