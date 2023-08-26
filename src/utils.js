const inject = (promise, client, threadId) => ({
  threadId,
  stop: () => client._stopThread(threadId),
  then: (...args) => inject(promise.then(...args), client, threadId),
  catch: (...args) => inject(promise.catch(...args), client, threadId),
  finally: (...args) => inject(promise.finally(...args), client, threadId),
});

const once = (emitter, event, cb) => emitter.once(event, cb).off.bind(emitter, event, cb);

const random = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

module.exports = { inject, random, once };
