const { SocketNotConnectedError } = require('../errors');
const { random, sleep } = require('../helpers');

const W3CWebSocket = require('websocket').w3cwebsocket;
const WebSocket = require('websocket-as-promised');

const Channel = require('chnl');

const SPLITTER = '---Message--End---';

/**
 * Service that provides methods for interacting with BAS socket.
 */
class SocketService {

    /**
     * Create an instance of SocketService class.
     * 
     * @constructor
     * @param {Object} options - Remote control options object.
     */
    constructor (options) {
        this._onMessageReceived = new Channel();
        this._onMessageSent = new Channel();
        this._onClose = new Channel();
        this._onOpen = new Channel();
        this._options = options;
        this._attempts = 0;
        this._buffer = '';
    }

    get onMessageReceived() {
        return this._onMessageReceived;
    }

    get onMessageSent() {
        return this._onMessageSent;
    }

    /**
     * Asynchronously start the socket service with the specified port.
     * @param {Number} port - Selected port number.
     */
    async start(port) {
        this._ws = new WebSocket(`ws://127.0.0.1:${port}`, {
            createWebSocket: url => new W3CWebSocket(url)
        });

        this._ws.onMessage.addListener(message => {
            this.buffer = (self.buffer + message)
                .split(SPLITTER)
                .map(value => {
                    if (value) {
                        this._onMessageReceived.dispatchAsync(JSON.parse(value));
                    }
                    return value;
                })
                .pop();
        });

        this._ws.onOpen.addListener(() => {
            this.send('remote_control_data', {
                script: self.options.scriptName,
                password: self.options.password,
                login: self.options.login
            });
        })

        await this._connect();
    }

    async _connect() {
        return new Promise((resolve, reject) => {
            this._ws.onClose.addListener(() => {
                if (this._attempts == 60) {
                    reject(new SocketNotConnectedError())
                }

                sleep(1000).then(() => {
                    this._onClose.dispatchAsync();
                    this._attempts += 1;
                    this._ws.open();
                });
            });

            this._ws.onOpen.addListener(() => {
                this._onOpen.dispatchAsync();
                resolve();
            });
        });
    }

    send(msg_type, msg_data, msg_async = false) {
        let msg_id = random(100000, 999999);
        this.send({
            async: msg_async,
            type: msg_type,
            data: msg_data,
            id: msg_id
        });
        return msg_id;
    }

    send(data) {
        this._ws.send(JSON.stringify(data) + SPLITTER);
        this._onMessageSent.dispatchAsync(data);
    }

    close() {
        this._onMessageReceived.removeAllListeners();
        this._onMessageSent.removeAllListeners();
        this._onClose.removeAllListeners();
        this._onOpen.removeAllListeners();
        this._ws.close();
    }
}

module.exports = SocketService;