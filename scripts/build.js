const fs=require('fs'),path=require('path');
const dest=path.join(__dirname,'..','dist');fs.mkdirSync(dest,{recursive:true});
for(const name of ['index.html','app.js','pool.js','editorial.css','assets'])fs.cpSync(path.join(__dirname,'..',name),path.join(dest,name),{recursive:true});
console.log('Built WONDER public assets. Backend source is excluded from the static output.');
