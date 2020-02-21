
/**
 * 
 * @param {Promise} promise 
 * @param {*} client 
 * @param {*} threadId 
 */
const inject = (promise, client, threadId) => {
    let thenDef = promise.then;
    promise.then = (...args) => inject(thenDef.apply(promise, args), client, threadId);

    let catchDef = promise.catch;
    promise.catch = (...args) => inject(catchDef.apply(promise, args), client, threadId);

    let finallyDef = promise.finally;
    promise.finally = (...args) =>  inject(finallyDef.apply(promise, args), client, threadId);
    
    promise.stop = () => client._stopThread(threadId);

    promise.threadId = threadId;

    return promise;
}

const throwIf = (condition, message) => {
    if (condition) {
        throw new Error(message);
    }
}

const random = (min, max) => {
    return min + Math.floor(Math.random() * (max - min + 1));
}

module.exports = { throwIf, inject, random };