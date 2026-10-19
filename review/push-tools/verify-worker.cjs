const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../project/public/push-sw.js'),'utf8');
const orderId='12345678-1234-4234-8234-123456789abc',eventId='87654321-4321-4321-8321-cba987654321',token='a'.repeat(64),results=[];
function harness(audience='customer',route='/order/'+token){const listeners={},notifications=new Map(),opened=[];
 const worker={location:new URL('https://bakery.example/push-sw.js?audience='+audience),skipWaiting:()=>{},addEventListener:(kind,handler)=>listeners[kind]=handler,registration:{showNotification:async(title,options)=>notifications.set(options.tag,{title,...options})},clients:{claim:async()=>{},matchAll:async()=>[],openWindow:async url=>opened.push(url)}};
 const indexedDB={open:()=>{const request={result:{objectStoreNames:{contains:()=>true},close:()=>{},transaction:()=>({objectStore:()=>({get:()=>{const read={result:route?{path:route}:null};queueMicrotask(()=>read.onsuccess());return read;}})})}};queueMicrotask(()=>request.onsuccess());return request;}};
 vm.runInNewContext(source,{self:worker,URL,indexedDB,Promise});
 async function event(kind,data){let wait=Promise.resolve();listeners[kind]({...data,waitUntil:promise=>wait=promise});await wait;}
 return{listeners,notifications,opened,push:payload=>event('push',{data:{json:()=>payload}}),click:data=>event('notificationclick',{notification:{data,close:()=>{}}})};}
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(error){results.push({name,status:'FAIL',error:error.message});}console.log(name+': '+results.at(-1).status);}
(async()=>{
 await test('generic-notification-and-stable-tag-deduplication',async()=>{const h=harness(),payload={version:1,eventId,orderId,kind:'customer_approved',phone:'private',url:'https://evil.invalid'};await h.push(payload);await h.push(payload);assert.equal(h.notifications.size,1);const item=[...h.notifications.values()][0];assert.ok(!JSON.stringify(item).includes('private'));assert.ok(!JSON.stringify(item).includes('evil'));assert.equal(item.renotify,false);});
 await test('customer-click-resolves-only-local-private-route',async()=>{const h=harness();await h.click({kind:'customer_approved',orderId,url:'https://evil.invalid'});assert.deepEqual(h.opened,['https://bakery.example/order/'+token]);});
 await test('missing-route-uses-recovery-not-token-from-payload',async()=>{const h=harness('customer',null);await h.click({kind:'customer_approved',orderId,trackingToken:token});assert.deepEqual(h.opened,['https://bakery.example/notifications']);});
 await test('corrupt-local-route-cannot-open-external-site',async()=>{const h=harness('customer','https://evil.invalid');await h.click({kind:'customer_approved',orderId});assert.deepEqual(h.opened,['https://bakery.example/notifications']);});
 await test('owner-click-opens-authenticated-orders-no-ack-side-effect',async()=>{const h=harness('owner');await h.click({kind:'owner_new_order',orderId,url:'https://evil.invalid'});assert.deepEqual(h.opened,['https://bakery.example/orders']);assert.equal(h.listeners.notificationclose,undefined);});
 await test('malformed-and-cross-audience-push-ignored',async()=>{const h=harness();await h.push({version:1,eventId,orderId,kind:'owner_new_order'});await h.push({version:1,eventId:'invalid',orderId,kind:'customer_approved'});assert.equal(h.notifications.size,0);});
 await test('service-worker-never-caches-checkout-or-auth-requests',async()=>{assert.equal(harness().listeners.fetch,undefined);assert.ok(!source.includes('caches.open'));});
 fs.writeFileSync(path.join(__dirname,'service-worker-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length}));process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
