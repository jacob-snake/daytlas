// Synthetic provider only. Exercises the real Supabase adapter inside workerd.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';
const binary = process.argv[2];
if (!binary) throw new Error('Pass an installed Wrangler executable.');
const socket = createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const dir = await mkdtemp(join(tmpdir(), 'daytlas-account-smoke-'));
const source = fileURLToPath(new URL('../src/lib/account/', import.meta.url));
await writeFile(join(dir, 'worker.ts'), `
import { accountHandlers } from ${JSON.stringify(source + 'handler.ts')};
import { createAccountProvider } from ${JSON.stringify(source + 'server.ts')};
const config = {url:'https://example.supabase.co',key:'sb_publishable_synthetic',origin:'https://daytlas.com',preferences:false};
const user = {id:'a0000000-0000-4000-a000-000000000001',aud:'authenticated',role:'authenticated',email:'synthetic@example.test',email_confirmed_at:'2026-09-30T00:00:00Z',created_at:'2026-09-30T00:00:00Z',app_metadata:{},user_metadata:{}};
const token = btoa(JSON.stringify({alg:'HS256'})) + '.' + btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})) + '.signature';
const mock = async (url,init) => {
 if (init.cache !== 'no-store' || init.redirect !== 'error') throw new Error('Unsafe fetch');
 const path = new URL(url).pathname;
 if (path === '/auth/v1/verify') return Response.json({access_token:token,refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,user});
 if (path === '/auth/v1/user') return Response.json(user);
 if (path === '/auth/v1/otp') return Response.json({});
 if (path === '/auth/v1/logout') return new Response(null,{status:204});
 throw new Error('Unexpected network call');
};
const handlers = accountHandlers(()=>config,(request,config)=>createAccountProvider(request,config,mock));
export default {fetch(request) {return request.method === 'POST' ? handlers.POST(request) : handlers.GET(request)}};
`);
await writeFile(join(dir, 'wrangler.jsonc'), JSON.stringify({name:'daytlas-account-runtime-test',main:'worker.ts',compatibility_date:'2026-09-27',workers_dev:false}));
const child = spawn(binary,['dev','--local','--config',join(dir,'wrangler.jsonc'),'--ip','127.0.0.1','--port',String(port),'--show-interactive-dev-session=false'],{stdio:'inherit',detached:true});
const base = `http://127.0.0.1:${port}`;
try {
 let response;
 for (let i=0;i<100;i++) {
  try {response=await fetch(base);break;} catch {await new Promise(resolve=>setTimeout(resolve,250));}
 }
 assert.ok(response,'workerd failed to start');
 assert.deepEqual(await response.json(),{enabled:true,account:null,preferences:false});
 const post=(body,cookie,origin='https://daytlas.com')=>fetch(base,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
 assert.equal((await post({action:'request_code',email:'synthetic@example.test'},null,'https://evil.test')).status,403);
 assert.equal((await post({action:'request_code',email:'synthetic@example.test'})).status,200);
 const verified=await post({action:'verify_code',email:'synthetic@example.test',code:'123456'});
 assert.equal(verified.status,200);
 const cookies=verified.headers.getSetCookie();
 assert.ok(cookies.length); for(const cookie of cookies) {assert.match(cookie,/HttpOnly/i);assert.match(cookie,/Secure/i);assert.match(cookie,/SameSite=lax/i);}
 const header=cookies.map(c=>c.split(';')[0]).join('; ');
 const session=await fetch(base,{headers:{Cookie:header}});
 assert.equal((await session.json()).account.email,'synthetic@example.test');
 assert.match(session.headers.get('cache-control'),/no-store/);
 const logout=await post({action:'sign_out'},header);
 assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/i);
 console.log('PASS: workerd native Request/Response, OTP, secure cookies, verified session, CSRF, signout; no external requests.');
} finally {
 try {process.kill(-child.pid,'SIGTERM');} catch {}
 await rm(dir,{recursive:true,force:true});
}
