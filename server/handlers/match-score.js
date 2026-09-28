// Legacy prototype endpoint intentionally disabled.
// Production matching is server-side through /api/matches/generate so clients
// cannot submit arbitrary psychological profiles to the scoring engine.
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 res.setHeader('X-Robots-Tag','noindex, nofollow, nosnippet');
 return res.status(410).json({error:'This endpoint has been retired.'});
};
