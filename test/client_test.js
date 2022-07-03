const { assertEmptyObject, assertObject, assertError } = require('./utils');
const BasClient = require('../src');

const options = { scriptName: 'TestRemoteControl', workingDir: '../bas-remote-app' };
const errorMessage = 'Please start the client before calling this method';
const dummyClient = new BasClient(options);
const client = new BasClient(options);

describe('client', () => {
  before(() => client.start());

  after(() => client.close());

  describe('#sendAsync()', () => {
    it('should throw error when the client is not running', async () => {
      try {
        await dummyClient.sendAsync('set_global_variable', {
          name: 'TEST_VARIABLE',
          value: JSON.stringify('Hello')
        });
      } catch (error) {
        assertError(error, errorMessage);
      }
    });

    it('should work fine when the client is running', async () => {
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
    it('should throw error when the client is not running', () => {
      client.sendAsync('set_global_variable', {
        name: 'TEST_VARIABLE',
        value: JSON.stringify('Hello')
      }).catch((error) => {
        assertError(error, errorMessage);
      });
    });

    it('should work fine when the client is running', () => {
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
