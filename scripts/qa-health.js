const assert = require('node:assert/strict');
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://health.example.test';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'synthetic-public-key';
process.env.SUPABASE_SECRET_KEY = 'synthetic-private-key';
const S = require('../lib/supabase-server');
const handler = require('../server/handlers/health');
let mode = 'healthy', calls = [];
S.jsonFetch = async (url, options) => {
  calls.push({url, options});
  if (mode === 'down' || (mode === 'database-down' && url.includes('/rest/'))) throw new Error('PRIVATE_PROVIDER_DETAIL');
  if (mode === 'html') return {raw: '<html>Sign in</html>'};
  return url.includes('/settings') ? {mailer_autoconfirm: false} : [];
};
async function run(method = 'GET', origin = 'https://wonder.test') {
  calls = [];
  const headers = {};
  const res = {setHeader(k, v) {headers[k] = v;}, status(n) {this.statusCode = n; return this;}, json(b) {this.body = b; return this;}};
  await handler({method, headers: {host: 'wonder.test', origin}}, res);
  return {...res, headers};
}
(async () => {
  let r = await run();
  assert.equal(r.statusCode, 200); assert.deepEqual(r.body, {ok: true});
  assert.equal(r.headers['Cache-Control'], 'no-store, max-age=0');
  assert.equal(calls.length, 2);
  assert.ok(calls.some(c => new URL(c.url).searchParams.get('limit') === '0'));
  assert.ok(calls.every(c => !c.options.method || c.options.method === 'GET'));
  for (mode of ['down', 'database-down', 'html']) {
    r = await run(); assert.equal(r.statusCode, 503); assert.deepEqual(r.body, {ok: false});
    assert.ok(!JSON.stringify(r.body).includes('PRIVATE_PROVIDER_DETAIL'));
  }
  const secret = S.SECRET; S.SECRET = '';
  r = await run(); assert.equal(r.statusCode, 503); assert.equal(calls.length, 0); S.SECRET = secret;
  r = await run('POST'); assert.equal(r.statusCode, 405); assert.equal(calls.length, 0);
  r = await run('GET', 'https://unrelated.test'); assert.equal(r.statusCode, 403); assert.equal(calls.length, 0);
  console.log('PASS: health distinguishes backend failure from a static shell; read-only probes return no secrets or member data. Local contracts only.');
})().catch(e => {console.error(e); process.exitCode = 1;});
