/* Push only. Deliberately no fetch handler or offline cache: checkout, tokens,
   orders and Auth responses must always use the network. Shared by both origins. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const workerAudience=new URL(self.location.href).searchParams.get('audience')==='owner'?'owner':'customer';
self.addEventListener('push',event=>{
  let payload;try{payload=event.data.json();}catch{return;}
  if(payload?.version!==1||!uuid(payload.eventId)||!uuid(payload.orderId)||!['owner_new_order','customer_approved'].includes(payload.kind))return;
  if((payload.kind==='owner_new_order')!==(workerAudience==='owner'))return;
  const owner=payload.kind==='owner_new_order';
  event.waitUntil(self.registration.showNotification(owner?'התקבלה הזמנה חדשה | מאפיית יחד':'ההזמנה אושרה | מאפיית יחד',{
    body:owner?'פתחו את מערכת ההזמנות כדי לבדוק ולאשר את הבקשה.':'המאפייה אישרה את ההזמנה שלכם. פתחו את המעקב לעדכון.',
    icon:'/push-icon-192.png',badge:'/push-icon-192.png',lang:'he',dir:'rtl',tag:'yachad-'+payload.eventId,renotify:false,
    data:{kind:payload.kind,orderId:payload.orderId},
  }));
});
function savedCustomerPath(orderId){return new Promise(resolve=>{
  const request=indexedDB.open('yachad-push-v1',1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('routes'))request.result.createObjectStore('routes',{keyPath:'id'});};
  request.onerror=()=>resolve('/notifications');
  request.onsuccess=()=>{const db=request.result,read=db.transaction('routes').objectStore('routes').get('customer:'+orderId);read.onsuccess=()=>{const path=read.result?.path;db.close();resolve(typeof path==='string'&&/^\/order\/[a-f0-9]{64}$/.test(path)?path:'/notifications');};read.onerror=()=>{db.close();resolve('/notifications');};};
});}
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const data=event.notification.data;const path=workerAudience==='owner'?'/orders':data?.kind==='customer_approved'&&uuid(data.orderId)?await savedCustomerPath(data.orderId):'/notifications';
    const url=new URL(path,self.location.origin).href;
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(client=>new URL(client.url).origin===self.location.origin&&new URL(client.url).pathname===path);
    if(existing)return existing.focus();
    return self.clients.openWindow(url);
  })());
});
// Dismissal/click never acknowledges or approves an order; only the UI's
// authenticated server actions can do that. No notificationclose side effect.
