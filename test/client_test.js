const { assertEmptyObject, assertObject } = require('./utils');
const BasClient = require('../lib');

const client = new BasClient({ scriptName: 'TestRemoteControl', workingDir: '..\\bas-remote-app' });

describe('Client', () => {
    before(async () => {
        await client.start();
    });

    after(async () => {
        await client.close();
    });

    it('Should send custom message asynchronously', async () => {
        const obj = await client.sendAsync('set_global_variable', {
            name: 'TEST_VARIABLE',
            value: JSON.stringify('Hello')
        });
        assertEmptyObject(obj);

        const result = await client.sendAsync('get_global_variable', { name: 'TEST_VARIABLE' });
        assertObject(result);
    });

    it('Should send custom message', () => {
        client.sendAsync('set_global_variable', {
            name: 'TEST_VARIABLE',
            value: JSON.stringify('Hello')
        }).then((obj) => {
            assertEmptyObject(obj);
        });

        client.sendAsync('get_global_variable', { name: 'TEST_VARIABLE' })
            .then((result) => {
                assertObject(result);
            });
    });
});
