const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;res.status=n=>{res.statusCode=n;return res};res.json=d=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(d))};
 if(pathname.startsWith('/api/')){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>65536)return res.status(413).json({error:'Too large'});}try{req.body=raw?JSON.parse(raw):{};await require(path.join(root,'api/router.js'))(req,res)}catch(e){console.error(e);res.status(500).json({error:'Local request failed'})}return}
 const file=path.resolve(root,pathname==='/'?'index.html':'.'+pathname);if(!file.startsWith(root+'/')||['/lib/','/supabase/','/scripts/','/docs/'].some(p=>pathname.startsWith(p)))return res.status(404).end();try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).on('error',()=>res.status(404).end()).pipe(res)}catch{res.status(404).end()}
}).listen(3000,'0.0.0.0',()=>console.log('WONDER preview at http://localhost:3000'));
