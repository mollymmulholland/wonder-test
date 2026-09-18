// Lightweight MVP place autocomplete via OpenStreetMap Nominatim.
// Keep requests low-volume; production should move to a contracted geocoder.
const cache=new Map();
let lastRequestAt=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function placeLabel(row){
  const a=row.address||{};
  const city=a.city||a.town||a.village||a.municipality||a.hamlet||row.name||String(row.display_name||'').split(',')[0];
  const region=a.state||a.region||a.county||'';
  const country=a.country||'';
  return [...new Set([city,region,country].filter(Boolean))].join(', ');
}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed.'});
  const q=String(req.query?.q||'').trim();
  if(q.length<2)return res.status(200).json({places:[]});
  const key=q.toLowerCase();
  const cached=cache.get(key);
  if(cached&&Date.now()-cached.at<10*60*1000)return res.status(200).json({places:cached.places,source:'cache'});
  try{
    const wait=Math.max(0,1050-(Date.now()-lastRequestAt));
    if(wait)await sleep(wait);
    lastRequestAt=Date.now();
    const url='https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&layer=address&q='+encodeURIComponent(q);
    const r=await fetch(url,{headers:{'User-Agent':'Wonder-MVP/0.1 (https://wonder-mvp-preview.vercel.app)','Accept-Language':'en-US,en;q=0.9'}});
    if(!r.ok)throw new Error('Geocoder unavailable');
    const rows=await r.json();
    const allowed=new Set(['city','town','village','municipality','administrative','county','state','hamlet','suburb']);
    const seen=new Set();
    const places=[];
    for(const row of rows){
      if(row.addresstype&&!allowed.has(row.addresstype)&&!row.address?.city&&!row.address?.town&&!row.address?.village)continue;
      const label=placeLabel(row);if(!label||seen.has(label))continue;seen.add(label);
      places.push({label,lat:Number(row.lat),lng:Number(row.lon),country_code:row.address?.country_code||null,osm_type:row.osm_type||null,osm_id:row.osm_id||null});
      if(places.length===6)break;
    }
    cache.set(key,{at:Date.now(),places});
    res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=86400');
    return res.status(200).json({places,source:'nominatim'});
  }catch(e){
    console.error('place autocomplete',e);
    return res.status(200).json({places:[]});
  }
};