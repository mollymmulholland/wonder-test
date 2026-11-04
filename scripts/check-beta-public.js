// Anonymous read-only smoke checks. Never creates an account, sends mail,
// or substitutes for the two-account/device acceptance in docs/BETA-ACCEPTANCE.md.
const input = process.argv[2];
if (!input) {console.error('Usage: node scripts/check-beta-public.js https://FINAL-APP-ORIGIN'); process.exit(2);}
const url = new URL(input);
if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
  throw new Error('Supply a canonical HTTPS origin without a path, credentials, or query.');
}
const origin = url.origin;
const probes = [
  {path: '/', status: 200, content: 'text/html', marker: 'WONDER'},
  {path: '/privacy', status: 200, content: 'text/html', marker: 'privacy'},
  {path: '/api/health', status: 200, content: 'application/json', healthy: true},
  {path: '/api/signup', action: 'refresh', status: 401, content: 'application/json'},
  {path: '/api/journey', action: 'load', status: 401, content: 'application/json'},
  {path: '/api/operations', action: 'load', status: 401, content: 'application/json'},
  {path: '/api/chat', action: 'status', status: 401, content: 'application/json'},
];
(async () => {
  const results = [];
  for (const probe of probes) {
    try {
      const r = await fetch(origin + probe.path, {
        method: probe.action ? 'POST' : 'GET', redirect: 'manual',
        headers: probe.action ? {'Content-Type': 'application/json', Origin: origin} : {},
        ...(probe.action ? {body: JSON.stringify({action: probe.action})} : {}),
        signal: AbortSignal.timeout(15000),
      });
      const body = await r.text();
      const contentType = r.headers.get('content-type') || '';
      let matches = probe.marker ? body.toLowerCase().includes(probe.marker.toLowerCase()) : true;
      if (probe.content === 'application/json') {
        try {const data = JSON.parse(body); matches = probe.healthy ? data.ok === true : typeof data.error === 'string';}
        catch {matches = false;}
      }
      const privateApi = probe.path.startsWith('/api/');
      const noStore = (r.headers.get('cache-control') || '').includes('no-store');
      results.push({path: probe.path, status: r.status, expectedStatus: probe.status,
        pass: r.status === probe.status && contentType.includes(probe.content) && matches && (!privateApi || noStore)});
    } catch (e) {results.push({path: probe.path, pass: false, error: e.name});}
  }
  console.log(JSON.stringify({checkedAt: new Date().toISOString(), origin, scope: 'Anonymous smoke only; not production acceptance', results}, null, 2));
  if (results.some(r => !r.pass)) process.exitCode = 1;
})().catch(e => {console.error(e.message); process.exitCode = 1;});
