// Install version of yarn specified in package.json

const fs = require('fs');
const { spawn } = require('child_process');

const { engines: { yarn: yarnVersion }} = JSON.parse(fs.readFileSync(__dirname + "/../package.json"));

let install = spawn('npm', [
  'install',
  '-g',
  `yarn@${yarnVersion}`
]);

install.stdout.on('data', data => console.log(`${data}`));

install.stderr.on('data', err => console.log(`${err}`));

install.on('close', code => {
  if ( code === 0 ) {
    console.log('yarn installed successfully!')
  } else {
    console.error(`error: code ${code}`);
    console.error('\ndid you run as root?')
  }
});
