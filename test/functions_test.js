const Client = require('../lib/client');

const client = new Client({
    workingDir: 'C:\\Lenovo\\BAS Remote',
    scriptName: 'BASRemote'
});

client.onMessageReceived.addListener(message => {
    console.log(`<--- (${message})`);
});

client.onMessageSent.addListener(message => {
    console.log(`---> (${message})`);
});

client.start()
    .then(() => {
        console.log('started');
    })
    .catch((err) => {
        console.log(err);
    });