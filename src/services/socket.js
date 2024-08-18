const WebSocketAsPromised = require('websocket-as-promised');
const WebSocket = require('ws');
const { EventEmitter } = require('events');
const { InvalidEngineError } = require('./errors');

const SEPARATOR = '---Message--End---';

module.exports = class SocketService extends EventEmitter {
  /**
   * Create an instance of the `SocketService` class.
   *
   * @param {any} options - remote control options object.
   * @constructor
   */
  constructor(options) {
    super();
    this.options = options;
  }

  /**
   * Asynchronously start the socket service with the specified port.
   *
   * @param {number} port - selected port number.
   */
  async start(port) {
    this._ws = new WebSocketAsPromised(`ws://127.0.0.1:${port}`, {
      createWebSocket: (url) => new WebSocket(url),
      extractMessageData: (event) => event,
    });
    this._buffer = '';

    this._ws.onMessage.addListener((data) => {
      let buffer = this._buffer + data;
      buffer = buffer.split(SEPARATOR);
      buffer.forEach((message) => {
        if (message) {
          this.emit('messageReceived', JSON.parse(message));
        }
      });
      this._buffer = buffer.pop();
    });

    await this._connect();
  }

  async _connect() {
    let attempts = 0;
    const promise = new Promise((resolve, reject) => {
      this._ws.onClose.addListener((error) => {
        if (attempts === 60) {
          reject(new InvalidEngineError(`Cannot connect to the WebSocket server (reason: ${error.reason})`));
        }

        this.emit('close');

        setTimeout(() => {
          attempts += 1;
          this._open();
        }, 1000);
      });

      this._ws.onOpen.addListener(() => {
        this.emit('open');
        resolve();
      });
    });

    await this._open();
    return promise;
  }

  async _open() {
    try {
      await this._ws.open();
    } catch (error) {
      // ignore
    }
  }

  /**
   * [description]
   * @param {Object} message
   *
   * @returns {Number}
   */
  send(message) {
    this._ws.send(JSON.stringify(message) + SEPARATOR);
    this.emit('messageSent', message);
    return message.id;
  }

  /**
   * [description]
   * @returns {Promise}
   */
  async close() {
    if (!this._ws) return;
    this._ws.removeAllListeners();
    await this._ws.close();
  }
};
