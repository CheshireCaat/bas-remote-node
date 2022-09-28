const BasRemoteClient = require('..');

const client = new BasRemoteClient({ scriptName: 'TestRemoteControl' });

async function main() {
  await client.start();

  const result = await client.runFunction('GoogleSearch', { Query: 'cats' });

  result.forEach((link) => {
    console.log(link);
  });

  await client.close();
}

main();
