
/**
 * 
 * @param {Promise} promise 
 * @param {*} client 
 * @param {*} threadId 
 */
const inject = (promise, client, threadId) => {
    promise.stop = function()
    {
        client.send('stop_thread', {thread_id: threadId})
    }
    promise.threadId = function()
    {
        return threadId
    }
    var ThenOriginal = promise.then
    var CatchOriginal = promise.catch
    var FinallyOriginal = promise.finally

    promise.then = function()
    {
        var ThenRes = ThenOriginal.apply(promise, arguments)
        inject(ThenRes, client, threadId)
        return ThenRes
    };

    promise.catch = function()
    {
        var CatchRes = CatchOriginal.apply(promise, arguments)
        inject(CatchRes, client, threadId)
        return CatchRes
    };

    promise.finally = function()
    {
        var FinallyRes = FinallyOriginal.apply(promise, arguments)
        inject(FinallyRes, client, threadId)
        return FinallyRes
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