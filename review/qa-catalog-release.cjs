const {chromium,expect}=require('C:/Users/openb/.codex/tools/playwright-check/node_modules/@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path');
const BASE=process.env.QA_PUBLIC_URL||'http://127.0.0.1:4320',ADMIN=process.env.QA_ADMIN_URL||'http://127.0.0.1:4321';
const live=BASE.startsWith('https:'),OUT=path.join(__dirname,'release'),results=[];
const isOrderRequest=url=>/\/rest\/v1\/(?:rpc\/(?:create_bakery_order|get_bakery_(?:order|pickup|push)|register_bakery_push)|orders|order_attention)/.test(url);
(async()=>{await fs.mkdir(OUT,{recursive:true});const browser=await chromium.launch({headless:true});
try{for(const width of [390,430,768,1440,1920]){
 const context=await browser.newContext({viewport:{width,height:width===768?1024:width<500?844:1000},locale:'he-IL',reducedMotion:'reduce'});
 const p=await context.newPage(),errors=[],failed=[],orderRequests=[];p.setDefaultTimeout(20000);
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(isOrderRequest(r.url()))orderRequests.push(r.url());});
 p.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 if(live)await context.route('**/rest/v1/rpc/create_bakery_order',r=>r.abort());
 await p.goto(BASE+'/shop');await expect(p.getByTestId('catalog-only')).toBeVisible();
 const product=p.locator('[data-product-id="bourekas-02"]');await expect(product.getByRole('button',{name:'הוספה',exact:true})).toBeEnabled();
 await product.getByRole('button',{name:'הוספה',exact:true}).click();
 const cart=async()=>{if(width<=980){await p.locator('.shop-mobile-cart-button').click();}await expect(p.locator('.shop-continue-button')).toBeVisible();};
 await cart();await expect(p.locator('.shop-continue-button')).toBeDisabled();await expect(p.locator('.shop-continue-button')).toHaveText('הזמנות אונליין בקרוב');
 await expect(p.locator('#checkout-customerName')).toHaveCount(0);
 await p.locator('.shop-cart-panel').getByRole('button',{name:'הוספת 1 ק״ג בורקס תפוח אדמה',exact:true}).click();
 await expect(p.locator('.shop-cart-panel .shop-quantity span')).toHaveText('2');
 const screenshot=path.join(OUT,(live?'live':'local')+'-cart-'+width+'.png');await p.screenshot({path:screenshot});
 await p.evaluate(()=>{sessionStorage.setItem('yachad-checkout-draft-v1',JSON.stringify({step:'details'}));history.replaceState({yachadCheckoutStep:'details'},'');});
 await p.reload();await expect(p.locator('[data-product-id="bourekas-02"]')).toBeVisible();await cart();
 await expect(p.locator('.shop-cart-panel .shop-quantity span')).toHaveText('2');await expect(p.locator('#checkout-customerName')).toHaveCount(0);
 await expect(p.locator('.shop-continue-button')).toBeDisabled();
 expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 for(const route of ['/notifications','/order/'+'a'.repeat(64)]){await p.goto(BASE+route);await expect(p.locator('h1')).toHaveText('הזמנות אונליין ייפתחו בקרוב');}
 expect(orderRequests).toEqual([]);expect(errors).toEqual([]);expect(failed).toEqual([]);
 results.push({name:'catalog-cart-blocked-checkout-'+width,status:'PASS',screenshot,orderRequests:orderRequests.length,errors,failed});await context.close();console.log('PASS catalogue/cart '+width);
 }
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'he-IL',reducedMotion:'reduce'}),p=await context.newPage(),errors=[],requests=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(isOrderRequest(r.url()))requests.push(r.url());});
 await p.goto(ADMIN+'/orders');await expect(p.locator('#admin-password')).toBeVisible();await expect(p.locator('#admin-password')).toHaveValue('');
 if(!live){await p.locator('#admin-password').fill('local-review-only');await p.locator('.login-submit').click();await expect(p.locator('.sidebar')).toBeAttached();
 await p.getByRole('button',{name:'הזמנות',exact:true}).last().click();await expect(p.locator('.page-content h1')).toHaveText('הזמנות אונליין ייפתחו בקרוב');
 await expect(p.locator('.owner-order-alerts')).toHaveCount(0);await p.waitForTimeout(3300);expect(requests).toEqual([]);
 await p.screenshot({path:path.join(OUT,'local-admin-paused.png')});}
 expect(errors).toEqual([]);results.push({name:live?'admin-login-no-prefilled-password':'admin-paused-no-order-api',status:'PASS',errors,orderRequests:requests.length});await context.close();
 for(const width of [390,1440]){const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(BASE+'/');await expect(p.locator('a[href="/shop"]').first()).toHaveAccessibleName('לתפריט ולסל');expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();expect(errors).toEqual([]);await p.screenshot({path:path.join(OUT,(live?'live':'local')+'-home-'+width+'.png')});results.push({name:'home-smoke-'+width,status:'PASS',errors});await context.close();}
 for(const route of ['/terms','/privacy','/shipping','/cancellations','/accessibility']){const r=await fetch(BASE+route);expect(r.status).toBe(200);}
 const sw=await fetch(BASE+'/push-sw.js');expect(sw.status).toBe(200);expect(sw.headers.get('content-type')).toContain('javascript');
 results.push({name:'legal-routes-worker',status:'PASS'});
}finally{await browser.close();await fs.writeFile(path.join(OUT,(live?'live':'local')+'-results.json'),JSON.stringify(results,null,2));}
console.log('PASS '+results.length+' release scenarios; no orders submitted');})().catch(e=>{console.error(e.stack);process.exitCode=1;});
