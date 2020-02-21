const { assertResult } = require('./utils');
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

    it('Client should throw error if function is not exist', async () => {
        try {
            await client.runFunction('NotExistingFunction', {
                'X': 5,
                'Y': 4
            });
        } catch (error) {
            const errorMessage = 'ReferenceError: Can\'t find variable: NotExistingFunction during execution of action ';
            expect(error.message).to.be.equal(errorMessage);
            expect(error).to.be.an('Error');
        }
    });

    it('Client should run functions in parallel', async () => {
        const promise1 = client.runFunction('Add', {
            'X': 4,
            'Y': 5
        });

        const promise2 = client.runFunction('Add', {
            'X': 6,
            'Y': 7
        });

        const result = await Promise.all([promise1, promise2]);
        assertResult(result[0], 9);
        assertResult(result[1], 13);
    });

    it('Client should run multiple functions', async () => {
        const result1 = await client.runFunction('Add', {
            'X': 4,
            'Y': 5
        });
        assertResult(result1, 9);

        const result2 = await client.runFunction('Add', {
            'X': 6,
            'Y': 7
        });
        assertResult(result2, 13);
    });

    it('Client should run one function', async () => {
        const result = await client.runFunction('Add', {
            'X': 5,
            'Y': 4
        });
        assertResult(result, 9);
    });
});

