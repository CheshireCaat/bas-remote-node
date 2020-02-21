// eslint-disable-next-line node/no-unpublished-require
const { expect } = require('chai');

module.exports.assertResult = (result, expected) => {
    expect(result).to.be.a('number');
    expect(result).to.equal(expected);
};

module.exports.assertThread = (thread) => {
    expect(thread.isRunning).to.equal(false);
    thread.stop();
    expect(thread.threadId).to.equal(0);
};
