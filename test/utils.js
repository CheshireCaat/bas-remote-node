// eslint-disable-next-line node/no-unpublished-require
const { expect } = require('chai');

module.exports.assertEmptyObject = (result) => {
    const keysLength = Object.keys(result).length;
    expect(result).to.be.an('Object');
    expect(keysLength).to.be.equal(0);
};

module.exports.assertObject = (result) => {
    expect(result).to.be.an('String');
    expect(result).to.be.equal('Hello');
};

module.exports.assertResult = (result, expected) => {
    expect(result).to.be.a('number');
    expect(result).to.equal(expected);
};

module.exports.assertThread = (thread) => {
    expect(thread.isRunning).to.equal(false);
    thread.stop();
    expect(thread.threadId).to.equal(0);
};
