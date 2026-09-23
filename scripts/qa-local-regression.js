// Start and stop our own server; no dependency on a surviving shell session.
const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
const server=spawn(process.execPath,['scripts/dev-server.js'],{stdio:['ignore','pipe','inherit']});
server.stdout.once('data',()=>{const child=spawn(process.execPath,['scripts/qa-editorial.js'],{stdio:'inherit'});child.once('exit',code=>{server.kill();process.exitCode=code;});});server.once('error',e=>{console.error(e);process.exitCode=1});
