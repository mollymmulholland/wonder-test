const {randomUUID}=require('node:crypto');
const S=require('../../lib/supabase-server');
const {secureApi}=require('../../lib/api-security');
const {readState}=require('../../lib/journey-store');
const {allowAuth}=require('../../lib/auth-flows');
const {isOperator}=require('../../lib/operations');
const {view}=require('../../lib/connection-store');
const {fail}=require('../../lib/account-security');
const UUID=/^[0-9a-f]{8}-[0-9a-f-]{27}$/;
const bucket='wonder-portraits';
const storage=(path,options={})=>fetch(`${S.SUPABASE_URL}/storage/v1${path}`,{...options,signal:AbortSignal.timeout(12000),headers:{apikey:S.SECRET,Authorization:`Bearer ${S.SECRET}`,...options.headers}});
module.exports=async(req,res)=>{
  if(!secureApi(req,res,{methods:['GET','POST'],maxBodyBytes:1500000}))return;
  const {user,token}=await S.authRequest(req);if(!user)return res.status(401).json({error:'Sign in to access this portrait.'});
  try{
    if(req.method==='GET'){
      const id=new URL(req.url,'https://local.invalid').searchParams.get('id');if(!UUID.test(id||''))throw fail('Portrait not found.',404);
      const [photo]=await S.rest(`/wonder_portrait_photos?id=eq.${id}&select=*`,{admin:true});if(!photo)throw fail('Portrait not found.',404);
      let allowed=photo.user_id===user.id;
      if(!allowed)allowed=await isOperator(user.id);
      if(!allowed&&photo.status==='approved'){
        const pairs=await S.rest(`/wonder_connections?or=(member_a.eq.${user.id},member_b.eq.${user.id})&select=id&limit=100`,{admin:true});
        for(const p of pairs){const v=await view(user.id,p.id);if(['proposed','pending','mutual'].includes(v?.status)&&v.otherPortrait?.photo===`/api/photos?id=${id}`){allowed=true;break;}}
      }
      if(!allowed)throw fail('Portrait not found.',404);
      const response=await storage(`/object/authenticated/${bucket}/${photo.storage_path}`);if(!response.ok)throw new Error('Storage unavailable');
      const bytes=Buffer.from(await response.arrayBuffer());res.setHeader('Content-Type',photo.mime);res.setHeader('Content-Disposition','inline');return res.status(200).end(bytes);
    }
    if(!await allowAuth(req,'portrait-upload',user.id))throw fail('Please wait before trying another upload.',429);
    const current=await readState(user.id,token);if(!current||current.deleted||!current.consent.process)throw fail('Complete your account essentials first.',403);
    if(req.body.expected_version!==current.version)throw fail('Your portrait changed elsewhere. Reload before uploading.',409);
    if(req.body.action==='remove'){
      const next={...current,portrait:{...current.portrait,photo:'',approved:false},moderation:{photoApproved:false},availability:'paused',version:current.version+1};
      const rows=await S.rest(`/wonder_private_journey?user_id=eq.${user.id}&version=eq.${current.version}`,{admin:true,method:'PATCH',prefer:'return=representation',body:{state:next,version:next.version}});if(!rows.length)throw fail('Your portrait changed. Reload before trying again.',409);
      return res.status(200).json({state:next});
    }
    if(req.body.action!=='upload'||typeof req.body.data!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(req.body.data))throw fail('Choose a JPEG, PNG, or WebP photo.');
    const input=Buffer.from(req.body.data,'base64');if(input.length>1048576)throw fail('Choose a photo under 1 MB after resizing.');
    const sharp=require('sharp');const instance=sharp(input,{limitInputPixels:24000000,failOn:'warning'}),meta=await instance.metadata();
    if(!['jpeg','png','webp'].includes(meta.format)||meta.pages>1||meta.width<200||meta.height<200)throw fail('Choose a clear, still photograph at least 200 pixels wide and tall.');
    // Decode and re-encode server-side. Do not retain EXIF, GPS, or original file names.
    const clean=await instance.rotate().resize({width:1400,height:1800,fit:'inside',withoutEnlargement:true}).jpeg({quality:84}).toBuffer();
    if(clean.length>1048576)throw fail('This photograph is too large. Choose a smaller file.');
    const id=randomUUID(),path=`${user.id}/${id}.jpg`;
    await S.rest('/wonder_portrait_photos',{admin:true,method:'POST',body:{id,user_id:user.id,storage_path:path,mime:'image/jpeg'}});
    const uploaded=await storage(`/object/${bucket}/${path}`,{method:'POST',headers:{'Content-Type':'image/jpeg'},body:clean});
    if(!uploaded.ok)throw new Error('Storage write unavailable');
    const next={...current,portrait:{...current.portrait,photo:`/api/photos?id=${id}`,approved:false},moderation:{photoApproved:false,photoStatus:'pending'},availability:'paused',version:current.version+1};
    const rows=await S.rest(`/wonder_private_journey?user_id=eq.${user.id}&version=eq.${current.version}`,{admin:true,method:'PATCH',prefer:'return=representation',body:{state:next,version:next.version,updated_at:new Date().toISOString()}});
    if(!rows.length){await storage(`/object/${bucket}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]})});await S.rest(`/wonder_portrait_photos?id=eq.${id}`,{admin:true,method:'DELETE'});throw fail('Your portrait changed while uploading. Reload and choose the photo again.',409);}
    return res.status(200).json({state:next});
  }catch(e){const code=[400,403,404,409,429].includes(e.status)?e.status:503;return res.status(code).json({error:code===503?'Your photograph could not be saved or loaded. Please retry.':e.message});}
};
