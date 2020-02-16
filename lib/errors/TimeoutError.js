module.exports = class TimeoutError extends Error {
    constructor () {
        super(`Timeout during function execution.`);
    }
}