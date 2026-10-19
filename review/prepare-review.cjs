const {chromium,expect}=require('C:/Users/openb/.codex/tools/playwright-check/node_modules/@playwright/test');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root='http://127.0.0.1:4320';await fetch(root+'/__local/reset',{method:'POST'});await fetch(root+'/__local/control',{method:'POST',body:JSON.stringify({labOpen:true})});
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--mute-audio']});
 try{
 const client=await browser.newPage({viewport:{width:390,height:844},locale:'he-IL',reducedMotion:'reduce'});await client.route('https://utyzqpjjjwjkkdlepkag.supabase.co/**',r=>r.abort());await client.goto(root+'/shop');await client.locator('[data-product-id="bourekas-02"]').getByRole('button',{name:'הוספה',exact:true}).click();await client.locator('.shop-mobile-cart-button').click();await client.locator('.shop-continue-button').click();await client.locator('#checkout-customerName').fill('הזמנת הדגמה מקומית');await client.locator('#checkout-phone').fill('0501234567');await client.locator('#checkout-street').fill('רחוב בדיקה');await client.locator('#checkout-houseNumber').fill('12');await client.locator('#checkout-floor').fill('0');await client.locator('#checkout-apartment').fill('3');await client.locator('.shop-whatsapp-button').click();await expect(client).toHaveURL(/\/order\/[a-f0-9]{64}/);await expect(client.locator('h1')).toHaveText('ממתינים לאישור המאפייה');
 const trackingUrl=client.url();fs.writeFileSync(path.join(__dirname,'review-order.json'),JSON.stringify({trackingUrl,adminUrl:'http://127.0.0.1:4321/orders',localOnly:true,payment:false},null,2));await client.screenshot({path:path.join(__dirname,'online-qa/review-customer-pending.png'),fullPage:true});
 console.log(JSON.stringify({trackingUrl,admin:'http://127.0.0.1:4321/orders',order:'One local pending sample; alerts require manual start-shift gesture'}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
