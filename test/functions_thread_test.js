const { expect } = require('chai');
const { assertThread, assertResult } = require('./utils');
const BasClient = require('..');

const client = new BasClient({ scriptName: 'TestRemoteControl', workingDir: '../bas-remote-app' });

describe('thread (functions)', () => {
  before(() => client.start());

  after(() => client.close());

  describe('#runFunction()', () => {
    it('should throw error if function is not exist', async () => {
      const thread = client.createThread();

      try {
        await thread.runFunction('NotExistingFunction', {
          X: 5,
          Y: 4,
        });
      } catch (error) {
        const errorMessage = "ReferenceError: Can't find variable: NotExistingFunction during execution of action ";
        expect(error.message).to.be.equal(errorMessage);
        expect(error).to.be.an('Error');
      }

      assertThread(thread);
    });

    it('should stop function execution', async () => {
      const thread = client.createThread();

      const promise = thread.runFunction('GoogleSearch', { Query: 'cats' }).catch((error) => {
        const errorMessage = 'Task stopped manually';
        expect(error.message).to.be.equal(errorMessage);
        expect(error).to.be.an('Error');
      });

      thread.stop();
      await promise;
    });

    it('should run functions in parallel', async () => {
      const threads = [client.createThread(), client.createThread()];

      const promise1 = threads[0].runFunction('Add', {
        X: 4,
        Y: 5,
      });

      const promise2 = threads[1].runFunction('Add', {
        X: 6,
        Y: 7,
      });

      const result = await Promise.all([promise1, promise2]);
      assertResult(result[0], 9);
      assertResult(result[1], 13);

      assertThread(threads[0]);
      assertThread(threads[1]);
    });

    it('should run multiple functions', async () => {
      const thread = client.createThread();

      const result1 = await client.runFunction('Add', {
        X: 4,
        Y: 5,
      });
      assertResult(result1, 9);

      const result2 = await client.runFunction('Add', {
        X: 6,
        Y: 7,
      });
      assertResult(result2, 13);

      assertThread(thread);
    });

    it('should run one function', async () => {
      const thread = client.createThread();

      const result = await thread.runFunction('Add', {
        X: 5,
        Y: 4,
      });
      assertResult(result, 9);

      assertThread(thread);
    });

    it('should throw error if the client connection is lost', async () => {
      const thread = client.createThread();

      setTimeout(() => client._socket._ws.close(), 5000);
      try {
        await thread.runFunction('GoogleSearch', { Query: 'cats' });
      } catch (err) {
        expect(err.message).to.be.equal('The client connection has been closed.');
        expect(err).to.be.an('Error');
      }
    });
  });
});
