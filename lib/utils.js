
/**
 *
 * @param {Promise} promise
 * @param {*} client
 * @param {*} threadId
 */
const inject = (promise, client, threadId) => {
    const injected = promise;

    const thenDef = injected.then;
    injected.then = (...args) => inject(thenDef.apply(injected, args), client, threadId);

    const catchDef = injected.catch;
    injected.catch = (...args) => inject(catchDef.apply(injected, args), client, threadId);

    const finallyDef = injected.finally;
    injected.finally = (...args) => inject(finallyDef.apply(injected, args), client, threadId);

    injected.stop = () => client._stopThread(threadId);

    injected.threadId = threadId;

    return injected;
};

const throwIf = (condition, message) => {
    if (condition) {
        throw new Error(message);
    }
};

const random = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

module.exports = { throwIf, inject, random };
