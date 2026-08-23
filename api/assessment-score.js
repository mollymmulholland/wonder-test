// Legacy prototype endpoint intentionally disabled.
// Production assessment scoring occurs only through /api/assessment/complete,
// where the server loads responses owned by the authenticated user.
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 res.setHeader('X-Robots-Tag','noindex, nofollow, nosnippet');
 return res.status(410).json({error:'This endpoint has been retired.'});
};
