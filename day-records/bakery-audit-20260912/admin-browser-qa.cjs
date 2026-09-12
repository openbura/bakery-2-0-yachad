const { chromium } = require('C:/Users/openb/.codex/tools/playwright-check/node_modules/playwright');
const fs=require('node:fs/promises'),path=require('node:path');
const ROOT=__dirname,SHOTS=path.join(ROOT,'screenshots'),LOCAL='http://127.0.0.1:4174';
const SUPA='utyzqpjjjwjkkdlepkag.supabase.co';
const stamp=()=>new Date().toISOString();
const result={startedAt:stamp(),mode:'unchanged release build; ALL Supabase and Auth mocked in memory',realRemoteWrites:0,mockWrites:[],blocked:[],tests:[],screenshots:[],viewports:[],consoleErrors:[],pageErrors:[]};
let db,base,failLogin=false,failProduct=false,failSettings=false,delayProduct=0,reads=0;
const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'audit@example.invalid',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:stamp()};
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const session=()=>({access_token:enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})+'.audit-only-signature',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'audit-only-refresh-token',user});
const clone=x=>JSON.parse(JSON.stringify(x));
const reset=()=>{db=clone(base);failLogin=failProduct=failSettings=false;delayProduct=0;};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let browser,context,page;
async function step(name,fn){try{const evidence=await fn();result.tests.push({name,status:'COMPLETED',evidence});}catch(e){result.tests.push({name,status:'TEST_ERROR',error:e.message});}}
async function shot(name,fullPage=false){const p=path.join(SHOTS,'admin-'+name+'.png');await page.screenshot({path:p,fullPage});result.screenshots.push(p);return p;}
async function goto(route,title){await page.goto(LOCAL+route,{waitUntil:'domcontentloaded'});if(title)await page.getByRole('heading',{name:title,exact:true}).waitFor();await page.waitForTimeout(120);}
async function products(){await goto('/products','מה זמין היום?');}
async function settings(){await goto('/settings','שליטה במה שהלקוחות רואים');}
async function overview(){await goto('/','דשבורד');}
async function waitMock(n){for(let i=0;i<80&&result.mockWrites.length<n;i++)await pause(25);}
async function mockRoute(route){
 const req=route.request(),u=new URL(req.url()),method=req.method();
 if(u.origin===LOCAL&&['GET','HEAD'].includes(method))return route.continue();
 if(u.hostname!==SUPA){result.blocked.push({method,url:u.origin+u.pathname});return route.abort();}
 const json=async(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 if(u.pathname.startsWith('/auth/v1/')){
   if(u.pathname.endsWith('/token')){if(failLogin){failLogin=false;return json({error:'invalid_grant',error_description:'Invalid login credentials'},400);}return json(session());}
   if(u.pathname.endsWith('/user'))return json(user);
   if(u.pathname.endsWith('/logout'))return route.fulfill({status:204,body:''});
   result.blocked.push({method,url:u.pathname,reason:'unhandled mocked auth'});return json({message:'Blocked audit auth endpoint'},400);
 }
 if(!u.pathname.startsWith('/rest/v1/')){result.blocked.push({method,url:u.pathname});return route.abort();}
 const table=u.pathname.split('/').pop();
 if(method==='GET'){
   reads++;
   let rows=table==='admin_users'?[{user_id:user.id,display_name:'מנהל בדיקה',role:'owner',active:true}]:table==='store_settings'?[db.store_settings]:db[table];
   if(!rows)return json({message:'Unknown audit table'},404);
   rows=clone(rows);
   for(const [k,v] of u.searchParams){if(v.startsWith('eq.'))rows=rows.filter(r=>String(r[k])===v.slice(3));}
   const single=(req.headers().accept||'').includes('application/vnd.pgrst.object');
   return json(single?rows[0]??null:rows);
 }
 if(method==='PATCH'&&['products','store_settings'].includes(table)){
   const patch=req.postDataJSON(),id=(u.searchParams.get('id')||'eq.default').slice(3);
   if(table==='products'&&failProduct){failProduct=false;result.mockWrites.push({table,id,patch,rejected:true});return json({message:'Simulated permission/network save failure',code:'42501'},403);}
   if(table==='store_settings'&&failSettings){failSettings=false;result.mockWrites.push({table,id,patch,rejected:true});return json({message:'Simulated settings failure',code:'42501'},403);}
   if(table==='products'&&delayProduct)await pause(delayProduct);
   const row=table==='products'?db.products.find(p=>p.id===id):db.store_settings;
   Object.assign(row,patch,{updated_at:stamp()});result.mockWrites.push({table,id,patch,rejected:false});return json({id});
 }
 result.blocked.push({method,url:u.pathname,reason:'unhandled write blocked'});return json({message:'No real writes allowed'},403);
}
(async()=>{
 base=JSON.parse(await fs.readFile(path.join(ROOT,'public-fixtures.json'),'utf8'));
 base.products.forEach(p=>p.updated_at=base.store_settings.updated_at);
 base.categories.forEach(c=>c.active=true);base.store_settings.id='default';reset();
 browser=await chromium.launch({headless:true});
 context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await context.route('**/*',mockRoute);
 await context.routeWebSocket('**/*',ws=>{result.blocked.push({url:ws.url(),reason:'websocket blocked'});ws.close();});
 page=await context.newPage();page.setDefaultTimeout(7000);
 page.on('pageerror',e=>result.pageErrors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text());});
 await step('login error and successful mocked login',async()=>{
   await goto('/login','כניסה למערכת');
   const prefill={usernameIsDummy:await page.locator('#admin-username').inputValue()==='audit-owner',passwordIsDummy:await page.locator('#admin-password').inputValue()==='audit-not-a-real-password'};
   await shot('login-1440');failLogin=true;await page.getByRole('button',{name:'התחברות',exact:true}).click();await page.getByRole('alert').waitFor();
   const error=await page.getByRole('alert').innerText();await shot('login-error');
   await page.getByRole('button',{name:'התחברות',exact:true}).click();await page.getByRole('heading',{name:'דשבורד',exact:true}).waitFor();return {prefill,error,authorizedHeading:true};
 });
 await step('direct route and restored session',async()=>{await products();const count=await page.locator('.product-row').count();await page.reload();await page.getByRole('heading',{name:'מה זמין היום?'}).waitFor();return {count,restored:true};});
 await step('product filters, search and empty state',async()=>{
   await products();const all=await page.locator('.product-row').count();
   await page.getByRole('searchbox').fill('כוסמין');const searchCount=await page.locator('.product-row').count();
   await page.getByRole('searchbox').fill('בדיקה-אין-מוצר-כזה');await page.locator('.empty-state').waitFor();const emptyText=await page.locator('.empty-state').innerText();await shot('products-empty');
   await page.locator('.empty-state button').click();
   await page.getByRole('combobox').nth(0).selectOption(base.categories[0].id);const categoryCount=await page.locator('.product-row').count();
   await page.getByRole('combobox').nth(1).selectOption('unavailable');const unavailableCount=await page.locator('.product-row').count();
   return {all,searchCount,emptyText,categoryCount,unavailableCount};
 });
 await step('price validation, comma warning and successful mocked save',async()=>{
   await products();await page.locator('.product-row').first().getByRole('button',{name:/עריכת מחיר/}).click();
   await page.locator('#product-price').fill('0');await page.getByRole('button',{name:'שמירת מחיר',exact:true}).click();const invalid=await page.locator('#product-price-error').innerText();
   await page.locator('#product-price').fill('150.50');const dotWarn=await page.locator('#product-price-warning').count();
   await page.locator('#product-price').fill('150,50');const commaWarn=await page.locator('#product-price-warning').count();await shot('price-comma-warning');
   await page.locator('#product-price').fill('72.50');await page.getByRole('button',{name:'שמירת מחיר',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});return {invalid,dotWarn,commaWarn,savedAgorot:db.products[0].price_agorot};
 });
 await step('price save failure keeps dialog and draft',async()=>{
   await page.locator('.product-row').first().getByRole('button',{name:/עריכת מחיר/}).click();await page.locator('#product-price').fill('75');failProduct=true;
   await page.getByRole('button',{name:'שמירת מחיר',exact:true}).click();await page.locator('#product-price-error').waitFor();const e={error:await page.locator('#product-price-error').innerText(),draft:await page.locator('#product-price').inputValue(),savedAgorot:db.products[0].price_agorot};await shot('price-save-error');await page.getByRole('button',{name:'ביטול',exact:true}).click();return e;
 });
 await step('price dialog keyboard focus containment',async()=>{
   await page.locator('.product-row').first().getByRole('button',{name:/עריכת מחיר/}).click();await page.locator('#product-price').focus();const trail=[];
   for(let i=0;i<7;i++){await page.keyboard.press('Tab');trail.push(await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent,insideDialog:!!document.activeElement.closest('[role=dialog]')})));}
   await page.keyboard.press('Escape');return {focusEscapes:trail.some(x=>!x.insideDialog),trail};
 });
 await step('pending first product does not silently accept second edit',async()=>{
   reset();await products();delayProduct=2200;const rows=page.locator('.product-row');const first=rows.nth(0),second=rows.nth(1);const n=result.mockWrites.length;
   await first.locator('.availability-button').click();await second.getByRole('button',{name:/עריכת מחיר/}).click();await page.locator('#product-price').fill('88');await page.getByRole('button',{name:'שמירת מחיר',exact:true}).click();
   const dialogClosed=await page.getByRole('dialog').count()===0;await page.waitForTimeout(2400);delayProduct=0;
   return {dialogClosed,secondPriceAgorot:db.products[1].price_agorot,requestedSecondPrice:8800,writes:result.mockWrites.slice(n)};
 });
 await step('overview can disable both receipt methods while still open',async()=>{
   reset();await overview();let n=result.mockWrites.length;await page.getByRole('switch',{name:/משלוחים:/}).click();await waitMock(n+1);await page.getByRole('switch',{name:/משלוחים:/}).waitFor();await page.waitForTimeout(120);
   await page.getByRole('switch',{name:/איסוף עצמי:/}).click();await waitMock(n+2);await page.waitForTimeout(150);
   const e={ordering:db.store_settings.ordering_enabled,delivery:db.store_settings.delivery_enabled,pickup:db.store_settings.pickup_enabled,heading:await page.locator('#store-status-title').innerText()};await shot('open-with-no-fulfillment');return e;
 });
 await step('settings validates receipt methods, draft is lost on navigation',async()=>{
   reset();await settings();const boxes=page.getByRole('checkbox');await boxes.nth(1).uncheck({force:true});await boxes.nth(2).uncheck({force:true});const invalid=await page.locator('.validation-note').innerText();const disabled=await page.getByRole('button',{name:'שמירת שינויים'}).isDisabled();
   await boxes.nth(2).check({force:true});await boxes.nth(3).check({force:true});await page.locator('#customer-notice').fill('טיוטת הודעה לבדיקת איבוד שינויים');
   await page.locator('.sidebar__nav').getByRole('button',{name:'מוצרים',exact:true}).click();await page.locator('.sidebar__nav').getByRole('button',{name:'הגדרות',exact:true}).click();
   return {invalid,saveDisabled:disabled,draftAfterNavigation:await page.locator('#customer-notice').inputValue(),noticeActive:await page.getByRole('checkbox').nth(3).isChecked()};
 });
 await step('notice minimum length, successful save and failure',async()=>{
   await settings();await page.getByRole('checkbox').nth(3).check({force:true});await page.locator('#customer-notice').fill('אב');const shortDisabled=await page.getByRole('button',{name:'שמירת שינויים'}).isDisabled();
   await page.locator('#customer-notice').fill('הודעת בדיקה מקומית בלבד ללקוחות');await page.getByRole('button',{name:'שמירת שינויים'}).click();await page.waitForTimeout(220);
   const savedNotice=db.store_settings.customer_notice_text;
   await page.locator('#customer-notice').fill('הודעה שנכשלה ונשארת בטופס');failSettings=true;await page.getByRole('button',{name:'שמירת שינויים'}).click();await page.locator('.sticky-save-bar [role=alert]').waitFor();
   const e={shortDisabled,savedNotice,error:await page.locator('.sticky-save-bar [role=alert]').innerText(),draft:await page.locator('#customer-notice').inputValue(),dbNotice:db.store_settings.customer_notice_text};await shot('settings-save-error');return e;
 });
 await step('settings stale snapshot overwrites second manager update',async()=>{
   reset();await settings();const readBefore=reads;db.store_settings.delivery_enabled=false;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(200);
   const staleDeliveryStillChecked=await page.getByRole('checkbox').nth(1).isChecked();await page.getByRole('checkbox').nth(3).check({force:true});await page.locator('#customer-notice').fill('עדכון הודעה אחרי שמנהל אחר השהה משלוח');await page.getByRole('button',{name:'שמירת שינויים'}).click();await page.waitForTimeout(250);
   return {readCountOnFocus:reads-readBefore-1,staleDeliveryStillChecked,deliveryAfterUnrelatedNoticeSave:db.store_settings.delivery_enabled,lastPatch:result.mockWrites.at(-1).patch};
 });
 await step('closed notice keeps ordering enabled',async()=>{
   reset();await settings();await page.getByRole('checkbox').nth(3).check({force:true});await page.locator('input[value=closed]').check();await page.locator('#customer-notice').fill('החנות סגורה בבדיקת זיכרון בלבד');await page.getByRole('button',{name:'שמירת שינויים'}).click();await page.waitForTimeout(200);return {noticeType:db.store_settings.customer_notice_type,ordering:db.store_settings.ordering_enabled};
 });
 await step('settings checkbox visual focus',async()=>{
   await settings();await page.getByRole('checkbox').nth(0).focus();const e=await page.getByRole('checkbox').nth(0).evaluate(el=>{const s=getComputedStyle(el),p=getComputedStyle(el.closest('label'));return {active:document.activeElement===el,opacity:s.opacity,outline:s.outline,parentOutline:p.outline,parentBoxShadow:p.boxShadow};});await shot('settings-keyboard-focus');return e;
 });
 reset();
 for(const width of [390,768,1024,1440])for(const [route,title,name] of [['/','דשבורד','overview'],['/products','מה זמין היום?','products'],['/settings','שליטה במה שהלקוחות רואים','settings']]){
   await step(name+' viewport '+width,async()=>{await page.setViewportSize({width,height:width<768?844:1024});await goto(route,title);const e=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,rtl:getComputedStyle(document.documentElement).direction,overflow:[...document.querySelectorAll('button,input,select,textarea,h1,h2')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&((r.left< -1)||(r.right>innerWidth+1));}).map(el=>({tag:el.tagName,text:el.textContent?.slice(0,80)}))}));result.viewports.push({name,...e});await shot(name+'-'+width,name==='settings'&&width===390);return e;});
 }
 await step('mobile profile menu and logout',async()=>{await page.setViewportSize({width:390,height:844});await overview();await page.getByRole('button',{name:'פתיחת תפריט משתמש'}).click();const menuVisible=await page.locator('.profile-menu').isVisible();await page.locator('.profile-menu').getByRole('button',{name:'יציאה'}).click();await page.getByRole('heading',{name:'כניסה למערכת'}).waitFor();await page.goto(LOCAL+'/products');await page.getByRole('heading',{name:'כניסה למערכת'}).waitFor();return {menuVisible,loggedOut:true,protectedRouteRedirect:page.url()};});
 result.completedAt=stamp();result.mockWriteCount=result.mockWrites.length;await fs.writeFile(path.join(ROOT,'admin-browser-qa.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({tests:result.tests,viewports:result.viewports,mockWriteCount:result.mockWriteCount,realRemoteWrites:0,pageErrors:result.pageErrors,consoleErrors:result.consoleErrors,blocked:result.blocked},null,2));await browser.close();
})().catch(async e=>{result.fatal=e.stack;await fs.writeFile(path.join(ROOT,'admin-browser-qa.json'),JSON.stringify(result,null,2));if(browser)await browser.close();console.error(e.stack);process.exitCode=1;});
