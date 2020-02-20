// eslint-disable-next-line node/no-unpublished-require
const { expect } = require('chai');
const BasClient = require('../lib');

const client = new BasClient({scriptName: 'TestRemoteControl'});

describe('When functions are launched from client', () => {
    before(async () => {
        await client.start();
    });

    after(async () => {
        await client.close();
    });

    it('Client should run one function', async () => {
        const result = await client.runFunction('Add', {
            'X': 0,
            'Y': 0
        });
        expect(result).to.be.a('number');
        expect(result).to.equal(0);
    });
});

