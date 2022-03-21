const fs = require('fs');
const ScriptDownloader = require('./loader');

async function main() {
  const worker = new ScriptDownloader();
  worker.on('log', console.log);

  const buffer = await worker.get(
    'https://bablosoft.com/distr/FastExecuteScriptProtected64/24.3.1/FastExecuteScriptProtected.x64.zip'
  );

  if (buffer.length) {
    await new Promise((resolve, reject) => {
      fs.writeFile('./Script.zip', buffer, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

main();
