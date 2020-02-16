module.exports = class SocketNotConnectedError extends Error {
    constructor () {
        super(`Cannot connect to the WebSocket server.`);
    }
}