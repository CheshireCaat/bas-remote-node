
/**
 * 
 * @param {Promise} promise 
 * @param {*} client 
 * @param {*} threadId 
 */
const inject = (promise, client, threadId) => {
    promise.stop = () => {
        client.send('stop_thread', {'thread_id': threadId})
    };
    promise.threadId = threadId;
    
    let thenDef = promise.then;
    let catchDef = promise.catch;
    let finallyDef = promise.finally;

    promise.then = (...args) => {
        let thenNew = thenDef.apply(promise, args);
        inject(thenNew, client, threadId);
        return thenNew;
    };

    promise.catch = (...args) => {
        let catchNew = catchDef.apply(promise, args);
        inject(catchNew, client, threadId);
        return catchNew;
    };

    promise.finally = (...args) => {
        let finallyNew = finallyDef.apply(promise, args);
        inject(finallyNew, client, threadId);
        return finallyNew;
    };
    
    return promise;
}

const random = (min, max) => {
    return min + Math.floor(Math.random() * (max - min + 1));
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { inject, random, sleep };