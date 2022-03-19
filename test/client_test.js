const { assertEmptyObject, assertObject, assertError } = require('./utils');
const BasClient = require('../lib');

const options = { scriptName: 'TestRemoteControl', workingDir: '..\\bas-remote-app' };
const errorMessage = 'Please start the client before calling this method';
const dummyClient = new BasClient(options);
const client = new BasClient(options);

describe('Client', () => {
  before(async () => {
    await client.start();
  });

  after(async () => {
    await client.close();
  });

  describe('#sendAsync()', () => {
    it('Should throw error when the client is not running', async () => {
      try {
        await dummyClient.sendAsync('set_global_variable', {
          name: 'TEST_VARIABLE',
          value: JSON.stringify('Hello')
        });
      } catch (error) {
        assertError(error, errorMessage);
      }
    });

    it('Should work fine when the client is running', async () => {
      const obj = await client.sendAsync('set_global_variable', {
        name: 'TEST_VARIABLE',
        value: JSON.stringify('Hello')
      });
      assertEmptyObject(obj);

      const result = await client.sendAsync('get_global_variable', { name: 'TEST_VARIABLE' });
      assertObject(result);
    });
  });

  describe('#send()', () => {
    it('Should throw error when the client is not running', () => {
      client.sendAsync('set_global_variable', {
        name: 'TEST_VARIABLE',
        value: JSON.stringify('Hello')
      }).catch((error) => {
        assertError(error, errorMessage);
      });
    });

    it('Should work fine when the client is running', () => {
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
});
