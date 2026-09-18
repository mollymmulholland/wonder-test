const routes = {
 'signup':require('../server/handlers/signup'),
 'experience':require('../server/handlers/experience'),
 'chat':require('../server/handlers/chat'),
 'persist':require('../server/handlers/persist'),
 'places':require('../server/handlers/places'),
 'assessment/start':require('../server/handlers/assessment/start'),
 'assessment/next':require('../server/handlers/assessment/next'),
 'assessment/respond':require('../server/handlers/assessment/respond'),
 'assessment/complete':require('../server/handlers/assessment/complete'),
 'assessment-score':require('../server/handlers/assessment-score'),
 'match-score':require('../server/handlers/match-score'),
 'matches/generate':require('../server/handlers/matches/generate'),
 'admin-diagnostics':require('../server/handlers/admin-diagnostics')
};
module.exports=async(req,res)=>{const url=new URL(req.url,'http://localhost');const route=String(req.query?.route||url.searchParams.get('route')||url.pathname.replace(/^\/api\//,''));const handler=routes[route];if(!handler)return res.status(404).json({error:'Not found.'});return handler(req,res)};
