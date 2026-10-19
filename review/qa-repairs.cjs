const {chromium,expect}=require('C:/Users/openb/.codex/tools/playwright-check/node_modules/@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path');
const BASE='http://127.0.0.1:4310',OUT=__dirname,results=[];let browser,contexts=[];
const filter=process.argv[2]?new RegExp(process.argv[2]):null;
async function control(value){const r=await fetch(BASE+'/__review/control',{method:'POST',body:JSON.stringify(value)});if(!r.ok)throw Error('Control failed');}
async function reset(){await fetch(BASE+'/__review/reset',{method:'POST'});}
async function test(name,fn){if(filter&&!filter.test(name))return;await reset();try{const evidence=await fn();results.push({name,status:'PASS',evidence});}catch(e){results.push({name,status:'FAIL',error:e.stack});}finally{await Promise.all(contexts.splice(0).map(c=>c.close()));}console.log(name+': '+results.at(-1).status+(results.at(-1).error?' '+results.at(-1).error.slice(0,350):''));await fs.writeFile(path.join(OUT,filter?'qa-selected.json':'qa-results.json'),JSON.stringify(results,null,2));}
async function setup(width=390,height=width===768?1024:width<500?844:1000,init){
 const context=await browser.newContext({viewport:{width,height},locale:'he-IL',reducedMotion:'reduce'});contexts.push(context);
 if(init)await context.addInitScript(init);
 const page=await context.newPage(),errors=[],handoffs=[];
 page.on('pageerror',e=>errors.push(e.message));
 context.on('page',p=>p.on('framenavigated',frame=>{if(frame===p.mainFrame()&&frame.url().includes('/__review/order'))handoffs.push(new URL(frame.url()).searchParams.get('text'));}));
 page.setDefaultTimeout(12000);await page.goto(BASE+'/shop');
 await expect(page.locator('[data-product-id="bourekas-02"] button')).toBeEnabled();
 return {context,page,errors,handoffs};
}
async function add(p,id){await p.locator(`[data-product-id="${id}"]`).getByRole('button',{name:'הוספה',exact:true}).click();}
async function openCart(p){const b=p.locator('.shop-mobile-cart-button');if(await b.isVisible())await b.click();await expect(p.locator('.shop-cart-panel')).toBeVisible();await expect.poll(()=>p.locator('.shop-cart-panel').evaluate(e=>{const t=getComputedStyle(e).transform;return t==='none'?0:Math.round(new DOMMatrixReadOnly(t).m42);})).toBe(0);}
async function details(p){await p.locator('.shop-continue-button').click();await expect(p.locator('#checkout-customerName')).toBeVisible();}
async function contact(p,phone='+972 50 123 4567'){await p.locator('#checkout-customerName').fill('לקוח בדיקה');await p.locator('#checkout-phone').fill(phone);}
async function address(p){await p.locator('#checkout-street').fill('רחוב בדיקה');await p.locator('#checkout-houseNumber').fill('12');await p.locator('#checkout-floor').fill('0');await p.locator('#checkout-apartment').fill('3');}
async function shot(p,name){const file=path.join(OUT,name+'.png');await p.screenshot({path:file,fullPage:false});return file;}
async function pickup(p){await p.locator('.shop-cart-panel').getByLabel('איסוף עצמי',{exact:true}).check();}
async function noOverflow(p){expect(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);}
async function handoff(p,arr){await p.locator('.shop-whatsapp-button').click();await expect.poll(()=>arr.length).toBe(1);return arr[0];}
async function fixture(){return (await(await fetch(BASE+'/__review/state')).json()).data;}
(async()=>{
 browser=await chromium.launch({headless:true,channel:'chrome',args:['--mute-audio']});
 for(const width of [390,430,768,1440,1920])await test(`responsive-${width}-delivery-and-validation`,async()=>{
  const {page:p,errors,handoffs}=await setup(width);await noOverflow(p);await add(p,'bourekas-02');await openCart(p);
  await expect(p.locator('.shop-total-line strong')).toContainText('85');const cart=await shot(p,`cart-${width}`);
  await details(p);await p.locator('.shop-whatsapp-button').click();await expect(p.locator('#checkout-customerName-error')).toBeVisible();await expect(p.locator('#checkout-customerName')).toBeFocused();
  await contact(p);await address(p);await p.locator('#checkout-notes').fill('בדיקה מקומית בלבד');const checkout=await shot(p,`checkout-${width}`);
  const text=await handoff(p,handoffs);expect(text).toContain('0501234567');expect(text).toContain('קומה: 0');expect(text).toContain('85');expect(text).toContain('בדיקה מקומית בלבד');await noOverflow(p);expect(errors).toEqual([]);return {cart,checkout,summary:text};
 });
 await test('pickup-below-delivery-minimum-and-address',async()=>{
  const {page:p,handoffs}=await setup();await add(p,'drinks-01');await openCart(p);await expect(p.locator('#shop-minimum-hint')).toContainText('60');await p.locator('.shop-continue-button').click({force:true});expect(await p.locator('#checkout-customerName').count()).toBe(0);
  await pickup(p);await expect(p.locator('.shop-pickup-info')).toContainText('היוצרים 3');await details(p);await expect(p.locator('#checkout-street')).toHaveCount(0);await contact(p);const text=await handoff(p,handoffs);expect(text).toContain('איסוף עצמי');expect(text).not.toContain('רחוב:');return {shot:await shot(p,'pickup-390'),summary:text};
 });
 await test('draft-refresh-browser-back-forward-home',async()=>{
  const {page:p}=await setup();await add(p,'bourekas-02');await openCart(p);await details(p);await contact(p);await address(p);await p.locator('#checkout-notes').fill('לשמור טיוטה');await p.reload();await expect(p.locator('#checkout-customerName')).toHaveValue('לקוח בדיקה');await expect(p.locator('#checkout-street')).toHaveValue('רחוב בדיקה');await expect(p.locator('#checkout-notes')).toHaveValue('לשמור טיוטה');
  await p.goBack();await expect(p.locator('.shop-grid')).toBeVisible();await p.goForward();await expect(p.locator('#checkout-phone')).toHaveValue('+972 50 123 4567');
  await p.goto(BASE+'/');await p.goto(BASE+'/shop');await expect(p.locator('#checkout-customerName')).toHaveValue('לקוח בדיקה');expect(await p.evaluate(()=>JSON.stringify(history.state))).not.toContain('לקוח');return 'Contact/address and checkout step retained in this tab only; history contains no personal fields';
 });
 await test('other-city-private-house-no-hidden-fields',async()=>{
  const {page:p,handoffs}=await setup();await add(p,'bourekas-02');await openCart(p);await details(p);await contact(p);await address(p);await p.locator('#checkout-cityId').selectOption('other');await p.locator('.shop-whatsapp-button').click();await expect(p.locator('#checkout-otherCity-error')).toBeVisible();await p.locator('#checkout-otherCity').fill('יישוב בדיקה');await p.locator('#checkout-street').fill('רחוב אחר');await p.getByLabel('בית פרטי',{exact:true}).check();await expect(p.locator('#checkout-floor')).toHaveCount(0);await expect(p.locator('.shop-cart-summary .shop-warning')).toContainText('העלות הסופית');const text=await handoff(p,handoffs);expect(text).toContain('יישוב בדיקה');expect(text).not.toContain('קומה:');expect(text).not.toContain('דירה:');return {shot:await shot(p,'other-city-private'),summary:text};
 });
 await test('pizza-options-prices-max-edit-merge',async()=>{
  const {page:p}=await setup();await add(p,'pizza-sambusak-01');const dialog=p.locator('.shop-option-backdrop');await p.getByRole('button',{name:'הוספה להזמנה',exact:true}).click();await expect(p.locator('.shop-option-error')).toBeVisible();
  for(const [label,price]of [['זיתי קלמטה',23],['זיתים ירוקים',28],['זיתים שחורים',33]]){await dialog.getByLabel(label,{exact:true}).check();await expect(p.locator('.shop-option-footer strong')).toContainText(String(price));}
  await dialog.getByLabel('פלפל חריף',{exact:true}).click();expect(await dialog.locator('input:checked').count()).toBe(3);await p.getByRole('button',{name:'הוספה להזמנה',exact:true}).click();await add(p,'pizza-sambusak-01');await dialog.getByLabel('זיתי קלמטה',{exact:true}).check();await p.getByRole('button',{name:'הוספה להזמנה',exact:true}).click();await openCart(p);await expect(p.locator('.shop-cart-item')).toHaveCount(2);
  await p.locator('.shop-cart-item').filter({hasText:'זיתים שחורים'}).getByRole('button',{name:'עריכת פיצה אישית',exact:true}).click();await dialog.getByLabel('זיתים ירוקים',{exact:true}).uncheck();await dialog.getByLabel('זיתים שחורים',{exact:true}).uncheck();await p.getByRole('button',{name:'שמירת שינויים',exact:true}).click();await expect(p.locator('.shop-cart-item')).toHaveCount(1);await expect(p.locator('.shop-total-line strong')).toContainText('61');return await shot(p,'pizza-merged');
 });
 await test('salad-paid-options-toast-coordination',async()=>{
  const {page:p}=await setup();await add(p,'salads-01');const d=p.locator('.shop-option-backdrop');await d.getByLabel('מלפפון',{exact:true}).check();await d.getByLabel('טונה',{exact:false}).check();await d.getByLabel('מיונז',{exact:false}).check();await expect(p.locator('.shop-option-footer strong')).toContainText('50');await p.getByRole('button',{name:'הוספה להזמנה',exact:true}).click();const data=await fixture();const toast=data.products.find(x=>/טוסט/.test(x.name_he));expect(toast).toBeTruthy();await expect(p.locator(`[data-product-id="${toast.id}"] .shop-inquiry-button`)).toHaveAttribute('href',/^tel:/);await expect(p.locator(`[data-product-id="${toast.id}"]`).getByRole('button',{name:'הוספה',exact:true})).toHaveCount(0);return toast.id;
 });
 await test('price-and-fee-changes-visible-inside-open-cart',async()=>{
  const {page:p}=await setup();await add(p,'bourekas-02');await p.locator('[data-product-id="bread-15"]').scrollIntoViewIfNeeded();await openCart(p);await control({product:{id:'bourekas-02',price_agorot:7500},settings:{delivery_fee_agorot:1800}});await p.locator('.shop-continue-button').click();await expect(p.getByTestId('cart-feedback')).toContainText('עודכנו');await expect(p.locator('.shop-total-line strong')).toContainText('93');await expect(p.getByTestId('cart-feedback')).toBeInViewport();expect(await p.locator('#checkout-customerName').count()).toBe(0);const s=await shot(p,'price-review-inside-cart');await details(p);return s;
 });
 await test('stock-change-and-delivery-disabled-never-switches-silently',async()=>{
  const {page:p}=await setup();await add(p,'bourekas-02');await openCart(p);await control({product:{id:'bourekas-02',available_today:false}});await p.locator('.shop-continue-button').click();await expect(p.locator('.shop-cart-item-warning')).toBeVisible();await expect(p.locator('#checkout-customerName')).toHaveCount(0);
  await control({product:{id:'bourekas-02',available_today:true},settings:{delivery_enabled:false}});await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(p.getByTestId('fulfillment-status')).toBeVisible();await expect(p.locator('.shop-cart-panel').getByLabel('משלוח',{exact:true})).toBeChecked();await pickup(p);await details(p);return 'Explicit pickup selection required; stock failure blocks continuation';
 });
 await test('cancel-and-escape-ignore-late-response',async()=>{
  for(const method of ['button','escape']){
   const {page:p}=await setup();await add(p,'bourekas-02');await openCart(p);await control({control:{delay:1800}});await p.locator('.shop-continue-button').click();await expect(p.getByTestId('cart-feedback')).toContainText('מאמתים');if(method==='escape')await p.keyboard.press('Escape');else await p.getByRole('button',{name:'ביטול הבדיקה',exact:true}).click();await p.waitForTimeout(2100);await expect(p.locator('#checkout-customerName')).toHaveCount(0);await control({control:{delay:0}});if(method==='escape')await openCart(p);await details(p);
  }return 'Both cancellation paths retain draft and allow fresh retry';
 });
 await test('timeout-recovers-with-fresh-request',async()=>{
  const {page:p}=await setup();await add(p,'bourekas-02');await openCart(p);await control({control:{delay:16000}});await p.locator('.shop-continue-button').click();await expect(p.getByTestId('cart-feedback')).toContainText('זמן רב',{timeout:16000});await expect(p.getByTestId('cart-feedback').getByRole('button',{name:'ניסיון חוזר'})).toBeEnabled();await control({control:{delay:0}});await p.getByTestId('cart-feedback').getByRole('button',{name:'ניסיון חוזר'}).click();await expect(p.getByTestId('shop-degraded')).toHaveCount(0);await details(p);return await shot(p,'timeout-recovered');
 });
 await test('blocked-popup-manual-fallback-revalidates-and-invalidates-edits',async()=>{
  const {page:p}=await setup(390,844,()=>{window.open=()=>null;});await add(p,'drinks-01');await openCart(p);await pickup(p);await details(p);await contact(p);await p.locator('.shop-whatsapp-button').click();const a=p.locator('.shop-whatsapp-fallback');await expect(a).toBeVisible();await p.locator('#checkout-customerName').fill('שם שונה');await expect(a).toHaveCount(0);await p.locator('.shop-whatsapp-button').click();await expect(a).toBeVisible();await control({product:{id:'drinks-01',available_today:false}});await a.click();await expect(p.locator('#checkout-order')).toContainText('אזל');expect(p.url()).not.toContain('/__review/order');return await shot(p,'blocked-popup-stock-recheck');
 });
 await test('blocked-popup-same-tab-success',async()=>{
  const {page:p}=await setup(390,844,()=>{window.open=()=>null;});await add(p,'drinks-01');await openCart(p);await pickup(p);await details(p);await contact(p);await p.locator('.shop-whatsapp-button').click();await p.locator('.shop-whatsapp-fallback').click();await expect(p).toHaveURL(/\/__review\/order/);await expect(p.locator('#summary')).toContainText('0501234567');return 'Safe local handoff in same tab; no WhatsApp message sent';
 });
 await test('back-during-handoff-closes-reserved-popup',async()=>{
  const {context,page:p}=await setup();await add(p,'drinks-01');await openCart(p);await pickup(p);await details(p);await contact(p);await control({control:{delay:1800}});await p.locator('.shop-whatsapp-button').click();await expect.poll(()=>context.pages().length).toBe(2);await p.goBack();await expect(p.locator('.shop-grid')).toBeVisible();await p.waitForTimeout(2100);expect(context.pages().length).toBe(1);expect(p.url()).not.toContain('/__review/order');return 'Browser Back aborts validation and closes only its reserved popup';
 });
 await test('long-cart-and-short-checkout-copy-denied-remains-reachable',async()=>{
  const {page:p}=await setup(1440,600,()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied')}}});document.execCommand=()=>false;window.open=()=>null;});
  const data=await fixture();for(const item of data.products.filter(x=>x.active&&x.available_today&&!x.has_options&&!/טוסט/.test(x.name_he)).slice(0,12))await add(p,item.id);
  await expect(p.locator('.shop-cart-item')).toHaveCount(12);await p.locator('.shop-continue-button').scrollIntoViewIfNeeded();await details(p);await contact(p);await address(p);await p.locator('.shop-whatsapp-button').click();await p.locator('.shop-copy-button').click();await expect(p.locator('.shop-manual-copy textarea')).toBeVisible();await p.locator('.shop-manual-copy textarea').scrollIntoViewIfNeeded();await expect(p.locator('.shop-manual-copy textarea')).toBeInViewport();return await shot(p,'short-checkout-copy-denied');
 });
 await test('dynamic-catalog-count-hidden-category-required-config',async()=>{
  const data=await fixture();await control({products:data.products.filter(x=>x.id!=='drinks-01')});let s=await setup();await expect(s.page.getByTestId('shop-degraded')).toHaveCount(0);await expect(s.page.locator('.shop-product-card')).toHaveCount(77);
  await control({products:[...data.products,{...data.products.find(x=>x.id==='drinks-01'),id:'new-item'}]});await s.page.reload();await expect(s.page.locator('.shop-product-card')).toHaveCount(79);
  const group=data.product_option_groups.find(x=>x.required);await control({groups:data.product_option_groups.map(x=>x.id===group.id?{...x,min_select:0}:x)});await s.page.reload();await expect(s.page.locator(`[data-product-id="${group.product_id}"] .shop-stock-badge`)).toHaveText('לבירור');await expect(s.page.locator('[data-product-id="bourekas-02"] button')).toBeEnabled();
  await control({categories:data.categories.filter(x=>x.id!=='drinks')});await s.page.reload();await expect(s.page.getByTestId('shop-degraded')).toHaveCount(0);return '77/79 products work; malformed required group isolates one product; hidden category safe';
 });
 await test('corrupt-cache-and-image-error-fallback',async()=>{
  const {page:p,context,errors}=await setup(390,844,()=>{sessionStorage.setItem('yachad-checkout-v1',JSON.stringify({version:1,cart:{old:{id:'old',productId:'old',quantity:1,product:{name:'ישן'},unitPriceAgorot:100,selections:[]}}}));});expect(errors).toEqual([]);await expect(p.locator('.shop-mobile-cart-button')).toHaveCount(0);
  const image=p.locator('[data-product-id="bourekas-02"] img');const before=await image.boundingBox();await image.evaluate(e=>e.dispatchEvent(new Event('error')));const fallback=p.locator('[data-product-id="bourekas-02"] .shop-product-placeholder');await expect(fallback).toContainText('אינו זמין');const after=await fallback.boundingBox();expect(Math.abs(before.height-after.height)).toBeLessThan(2);await noOverflow(p);return await shot(p,'image-error-fallback');
 });
 await test('filesystem-http-routes-metadata-and-real-404',async()=>{
  const titles=[];for(const route of ['/','/shop','/terms','/privacy','/shipping','/cancellations','/accessibility']){const r=await fetch(BASE+route);expect(r.status).toBe(200);const html=await r.text();titles.push(html.match(/<title>(.*?)<\/title>/)[1]);expect(html).toMatch(new RegExp('rel="canonical" href="https://bakery-2-0-yachad-deploy.vercel.app'+(route==='/'?'/?':route)+'"'));}expect(new Set(titles).size).toBe(7);
  for(const route of ['/not-real','/assets/not-real.js'])expect((await fetch(BASE+route)).status).toBe(404);
  expect((await(await fetch(BASE+'/robots.txt')).text())).toContain('Sitemap:');expect((await(await fetch(BASE+'/sitemap.xml')).text())).toContain('/shop');return titles;
 });
 await test('min-boundary-6999-blocks-7000-allows-and-fresh-minimum',async()=>{
  await control({product:{id:'bourekas-02',price_agorot:6999}});const {page:p}=await setup();await add(p,'bourekas-02');await openCart(p);await expect(p.locator('#shop-minimum-hint')).toContainText('0.01');await p.locator('.shop-continue-button').click({force:true});await expect(p.locator('#checkout-customerName')).toHaveCount(0);
  await control({product:{id:'bourekas-02',price_agorot:7000}});await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(p.locator('#shop-minimum-hint')).toHaveCount(0);await control({settings:{minimum_delivery_subtotal_agorot:7100}});await p.locator('.shop-continue-button').click();await expect(p.locator('#shop-minimum-hint')).toContainText('71');await expect(p.getByTestId('cart-feedback')).toBeVisible();await expect(p.locator('#checkout-customerName')).toHaveCount(0);return 'Agorot-exact boundary and fresh minimum enforced';
 });
 await test('closed-empty-and-malformed-settings-fail-safe',async()=>{
  let s=await setup();await control({settings:{ordering_enabled:false}});await s.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(s.page.getByTestId('ordering-closed')).toBeVisible();await expect(s.page.locator('[data-product-id="bourekas-02"] button')).toBeDisabled();
  await control({settings:{ordering_enabled:true},products:[]});await s.page.reload();await expect(s.page.locator('.shop-empty-products')).toBeVisible();await expect(s.page.getByTestId('shop-degraded')).toHaveCount(0);
  await control({settings:{delivery_fee_agorot:-1}});await s.page.reload();await expect(s.page.getByTestId('shop-degraded')).toBeVisible();await expect(s.page.locator('[data-product-id="bourekas-02"] button')).toBeDisabled();return 'Closed and bad settings cannot authorize an order; empty live catalog has explicit state';
 });
 await test('mobile-landscape-long-cart-no-clipped-continue',async()=>{
  const {page:p}=await setup(844,390);const data=await fixture();for(const item of data.products.filter(x=>x.active&&x.available_today&&!x.has_options&&!/טוסט/.test(x.name_he)).slice(0,12))await add(p,item.id);await openCart(p);await p.locator('.shop-continue-button').scrollIntoViewIfNeeded();await expect(p.locator('.shop-continue-button')).toBeInViewport();await details(p);await noOverflow(p);return await shot(p,'landscape-checkout');
 });
 await test('owner-alert-demo-repeats-until-every-ack-and-survives-reload',async()=>{
  const context=await browser.newContext({viewport:{width:768,height:1024},reducedMotion:'reduce'});contexts.push(context);
  await context.addInitScript(()=>{window.demoPulses=0;const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(...args){window.demoPulses++;return original.apply(this,args);};});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(BASE+'/__review/alerts');await p.locator('#start').click();await expect(p.locator('#audioState')).toContainText('פעיל');await p.locator('#sample').click();await p.locator('#sample').click();await expect(p.locator('#count')).toHaveText('2');
  const first=await p.evaluate(()=>window.demoPulses);await expect.poll(()=>p.evaluate(()=>window.demoPulses),{timeout:8500}).toBeGreaterThan(first);
  await p.locator('#failure').check();await p.locator('.order.unseen').first().getByRole('button',{name:'ראיתי',exact:true}).click();await expect(p.locator('#count')).toHaveText('2');await expect(p.locator('#message')).toContainText('נכשלה');
  await p.locator('#failure').uncheck();await p.locator('.order.unseen').first().getByRole('button',{name:'ראיתי',exact:true}).click();await expect(p.locator('#count')).toHaveText('1');await expect(p.locator('.order').filter({hasText:'ממתינה להחלטה'})).toHaveCount(1);const screen=await shot(p,'owner-alert-768');
  await p.reload();await expect(p.locator('#count')).toHaveText('1');await expect(p.locator('#audioState')).toContainText('טרם');await p.locator('#start').click();await p.locator('.order.unseen').getByRole('button',{name:'ראיתי',exact:true}).click();await expect(p.locator('#count')).toHaveText('0');const last=await p.evaluate(()=>window.demoPulses);await p.waitForTimeout(6500);expect(await p.evaluate(()=>window.demoPulses)).toBe(last);expect(errors).toEqual([]);await noOverflow(p);return {screen,pulseStoppedAfterAllSeen:true,failedAckDidNotSilence:true};
 });
 await test('owner-alert-mobile-without-wakelock-visible-warning',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844}});contexts.push(context);await context.addInitScript(()=>{Object.defineProperty(navigator,'wakeLock',{value:{request:async()=>{throw Error('denied')}}});});const p=await context.newPage();await p.goto(BASE+'/__review/alerts');await p.locator('#sample').click();await p.locator('#start').click();await expect(p.locator('#screenState')).toContainText('לא ניתן');await expect(p.locator('#count')).toHaveText('1');await p.locator('#end').click();await expect(p.locator('#count')).toHaveText('1');await noOverflow(p);return await shot(p,'owner-alert-390');
 });
 await browser.close();console.log(JSON.stringify({pass:results.filter(x=>x.status==='PASS').length,fail:results.filter(x=>x.status==='FAIL').length}));process.exitCode=results.some(x=>x.status==='FAIL')?1:0;
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
