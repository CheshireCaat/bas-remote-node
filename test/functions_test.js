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

    it('Client should run one function', async () => {
        const result = await client.runFunction('Add', {
            'X': 5,
            'Y': 4
        });
        expect(result).to.be.a('number');
        expect(result).to.equal(9);
    });
});

