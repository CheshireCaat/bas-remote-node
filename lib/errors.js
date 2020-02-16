class SocketNotConnectedError extends Error {
    constructor() {
        super(`Cannot connect to the WebSocket server.`);
    }
}

class AuthenticationError extends Error {
    constructor(message) {
        super(`Unsuccessful authentication. ${message}.`);
    }
}

class TimeoutError extends Error {
    constructor() {
        super(`Timeout during function execution.`);
    }
}

module.exports = {
    SocketNotConnectedError,
    AuthenticationError,
    TimeoutError
}