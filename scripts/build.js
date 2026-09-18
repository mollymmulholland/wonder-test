const fs=require('fs'),path=require('path');
const dest=path.join(__dirname,'..','dist');fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest,{recursive:true});
for(const name of ['index.html','app.js','pool.js','editorial.css','assets'])fs.cpSync(path.join(__dirname,'..',name),path.join(dest,name),{recursive:true});
console.log('Built WONDER public assets. Backend source is excluded from the static output.');

if(process.env.VERCEL_ENV==='preview')for(const name of ['layout-check.html','layout-check.js'])fs.copyFileSync(path.join(__dirname,name),path.join(dest,name));
