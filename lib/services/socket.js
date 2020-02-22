const WebSocketAsPromised = require('websocket-as-promised');
const WebSocket = require('websocket').w3cwebsocket;
const Channel = require('chnl');

const SEPARATOR = '---Message--End---';

module.exports = class SocketService {
    /**
     * Create an instance of SocketService class.
     *
     * @constructor
     * @param {Object} options - Remote control options object.
     */
    constructor(options) {
        this.options = options;

        this._createChannels();
        this._attempts = 0;
        this._buffer = '';
    }

    /**
     * Remove all WebSocket event channels.
     */
    _removeAllListeners() {
        this._onMessageReceived.removeAllListeners();
        this._onMessageSent.removeAllListeners();
        this._onClose.removeAllListeners();
        this._onOpen.removeAllListeners();
    }

    /**
     * Create all WebSocket event channels.
     */
    _createChannels() {
        this._onMessageReceived = new Channel();
        this._onMessageSent = new Channel();
        this._onClose = new Channel();
        this._onOpen = new Channel();
    }

    /**
    * Event channel triggered when message received.
    *
    * @returns {Channel}
    */
    get onMessageReceived() {
        return this._onMessageReceived;
    }

    /**
    * Event channel triggered when message sent.
    *
    * @returns {Channel}
    */
    get onMessageSent() {
        return this._onMessageSent;
    }

    /**
     *
     * @returns {Channel}
     */
    get onClose() {
        return this._onClose;
    }

    /**
     *
     * @returns {Channel}
     */
    get onOpen() {
        return this._onOpen;
    }

    /**
     * Asynchronously start the socket service with the specified port.
     * @param {Number} port - Selected port number.
     *
     * @returns {Promise}
     */
    async start(port) {
        this._ws = new WebSocketAsPromised(`ws://127.0.0.1:${port}`, { createWebSocket: (url) => new WebSocket(url) });

        this._ws.onMessage.addListener((data) => {
            let buffer = this._buffer + data;
            buffer = buffer.split(SEPARATOR);
            buffer.forEach((message) => {
                if (message) {
                    this._onMessageReceived.dispatchAsync(JSON.parse(message));
                }
            });
            this._buffer = buffer.pop();
        });

        await this._connect();
    }

    async _connect() {
        const promise = new Promise((resolve, reject) => {
            this._ws.onClose.addListener(async () => {
                if (this._attempts === 60) {
                    reject(new Error('Cannot connect to the WebSocket server'));
                }

                this._onClose.dispatchAsync();

                setTimeout(() => {
                    this._attempts += 1;
                    this._open();
                }, 1000);
            });

            this._ws.onOpen.addListener(() => {
                this._onOpen.dispatchAsync();
                resolve();
            });
        });

        await this._open();
        return promise;
    }

    async _open() {
        return new Promise((resolve) => {
            this._ws.open()
                .then(resolve)
                .catch(resolve);
        });
    }

    /**
     * [description]
     * @param {Object} message
     *
     * @returns {Number}
     */
    send(message) {
        this._ws.send(JSON.stringify(message) + SEPARATOR);
        this._onMessageSent.dispatchAsync(message);
        return message.id;
    }

    /**
     * [description]
     * @returns {Promise}
     */
    async close() {
        return this._ws.close()
            .then(() => {
                this._ws.removeAllListeners();
                this._removeAllListeners();
            });
    }
};
