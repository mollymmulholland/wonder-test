const fs=require('fs'),path=require('path');
const dest=path.join(__dirname,'..','dist');fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest,{recursive:true});
for(const name of ['index.html','app.js','pool.js','editorial.css','journey.css','journey-ui.js','sanctuary.js','sanctuary.css','interface.css','device-ui.js','operations-ui.js','manifest.webmanifest','service-worker.js','offline.html','public-shared','assets'])fs.cpSync(path.join(__dirname,'..',name),path.join(dest,name),{recursive:true});
console.log('Built WONDER public assets. Backend source is excluded from the static output.');

if(process.env.VERCEL_ENV==='preview')for(const name of ['layout-check.html','layout-check.js'])fs.copyFileSync(path.join(__dirname,name),path.join(dest,name));

fs.cpSync(path.join(__dirname,'../node_modules/@simplewebauthn/browser/esm'),path.join(dest,'vendor/webauthn'),{recursive:true});

const sharp=require('sharp');
Promise.all([192,512].map(size=>sharp(path.join(__dirname,'../assets/favicon.svg')).resize(size,size).png().toFile(path.join(dest,`assets/icon-${size}.png`)))).catch(error=>{console.error(error.message);process.exitCode=1;});
