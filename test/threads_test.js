// eslint-disable-next-line node/no-unpublished-require
const { expect } = require('chai');
const BasClient = require('../lib');

const client = new BasClient({scriptName: 'TestRemoteControl'});

describe('When functions are launched from thread', () => {
    before(async () => {
        await client.start();
    });

    after(async () => {
        await client.close();
    });

    it('Thread should run one function', async () => {
        const thread = client.createThread();
        const result = await thread.runFunction('Add', {
            'X': 0,
            'Y': 0
        });
    
        expect(result).to.be.a('number');
        expect(result).to.equal(0);
    });
});

