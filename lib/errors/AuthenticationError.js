module.exports = class AuthenticationError extends Error {
    constructor (message) {
        super(`Unsuccessful authentication. ${message}.`);
    }
}