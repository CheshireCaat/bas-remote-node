const { expect } = require('chai');

module.exports = {
  assertResult(result, expected) {
    expect(result).to.be.a('number');
    expect(result).to.equal(expected);
  },

  assertError(error, message) {
    expect(error.message).to.be.equal(message);
    expect(error).to.be.an('Error');
  },

  assertEmptyObject(result) {
    expect(result).to.be.an('Object');
    expect(Object.keys(result).length).to.be.equal(0);
  },

  assertObject(result) {
    expect(result).to.be.an('String');
    expect(result).to.be.equal('Hello');
  },

  assertThread(thread) {
    expect(thread.isRunning).to.equal(false);
    thread.stop();
    expect(thread.threadId).to.equal(0);
  },
};
