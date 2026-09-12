
const { chromium } = require('C:/Users/openb/.codex/tools/playwright-check/node_modules/playwright');
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const out=__dirname,shots=path.join(out,'screenshots');
const PUBLIC='https://bakery-2-0-yachad-deploy.vercel.app',ADMIN='https://yachad-bakery-admin.vercel.app';
const local='http://127.0.0.1:4173', localAdmin='http://127.0.0.1:4174';
(async()=>{
const browser=await chromium.launch({headless:true});
const result={date:new Date().toISOString(),live:{},viewports:[],fixtures:[],errors:[]};
const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
await ctx.route('**/*',async route=>{const r=route.request();if(!['GET','HEAD'].includes(r.method())||/wa\.me|whatsapp|tel:|instagram|waze|maps\.google/.test(r.url()))return route.abort();return route.continue();});
const p=await ctx.newPage(),fixture={};
p.on('pageerror',e=>result.errors.push({mode:'live',error:e.message}));
p.on('response',async r=>{const u=new URL(r.url());if(u.hostname.endsWith('.supabase.co')&&u.pathname.startsWith('/rest/v1/')&&r.ok()){try{fixture[u.pathname.split('/').pop()]=await r.json();}catch{}}});
for(const [name,url,htmlPath] of [['public',PUBLIC+'/shop','checkpoint-20260912/public-release-build/index.html'],['admin',ADMIN+'/login',null]]){
try{const response=await p.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await p.waitForTimeout(2500);const html=await response.text();result.live[name]={status:response.status(),scriptPaths:(html.match(/src="[^"]+\.js"/g)||[]),cssPaths:(html.match(/href="[^"]+\.css"/g)||[])};if(htmlPath){const expected=await fs.readFile(path.join(out,htmlPath),'utf8');result.live[name].htmlMatchesRelease=html===expected;}if(name==='admin'){result.live.admin.passwordPreFilled=await p.locator('input[type=password]').evaluateAll(es=>es.some(e=>e.value.length>0));result.live.admin.passwordFieldCount=await p.locator('input[type=password]').count();}else {result.live.public.productCards=await p.locator('.shop-product-card').count();result.live.public.bodyExcerpt=(await p.locator('body').innerText()).slice(0,1000);await p.screenshot({path:path.join(shots,'live-shop-1440.png')});}}
catch(e){result.live[name]={error:e.message};}
}
await ctx.close();
await fs.writeFile(path.join(out,'public-fixtures.json'),JSON.stringify(fixture,null,2));
result.fixtures=Object.fromEntries(Object.entries(fixture).map(([k,v])=>[k,Array.isArray(v)?v.length:typeof v]));
for(const width of [390,430,768,1024,1440,1920]){
const c=await browser.newContext({viewport:{width,height:width<768?844:1024},isMobile:width<768,hasTouch:width<768});
await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname.endsWith('.supabase.co')){let data=fixture[u.pathname.split('/').pop()];if(data)return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});return r.abort();}if(!['GET','HEAD'].includes(r.request().method())||/wa\.me|whatsapp/.test(u.hostname))return r.abort();return r.continue();});
const pg=await c.newPage();let errs=[];pg.on('pageerror',e=>errs.push(e.message));await pg.goto(local+'/shop',{waitUntil:'domcontentloaded'});await pg.waitForTimeout(1800);
result.viewports.push({width,...await pg.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:innerWidth,cards:document.querySelectorAll('.shop-product-card').length,headings:[...document.querySelectorAll('h1,h2')].map(e=>e.textContent),brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).length})),errors:errs});
await pg.screenshot({path:path.join(shots,'shop-'+width+'.png')});
if(width===1440){result.shopText=(await pg.locator('body').innerText()).slice(0,6500);result.buttons=await pg.getByRole('button').evaluateAll(es=>es.map(e=>({text:e.textContent,label:e.getAttribute('aria-label'),disabled:e.disabled}))).then(a=>a.slice(0,35));}
await c.close();
}
await fs.writeFile(path.join(out,'browser-baseline.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));await browser.close();
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
