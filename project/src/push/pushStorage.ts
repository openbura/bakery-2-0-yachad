export type PushRoute = { id: string; path: string };
const databaseName = 'yachad-push-v1';
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(databaseName,1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('routes'))request.result.createObjectStore('routes',{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('לא ניתן לשמור את קישור ההתראה במכשיר.'));
  });
}
export async function savePushRoute(route:PushRoute) {
  if(!/^customer:[a-f0-9-]{36}$/.test(route.id)||!/^\/order\/[a-f0-9]{64}$/.test(route.path))throw new Error('קישור המעקב אינו תקין.');
  const db=await openDatabase();
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('routes','readwrite');tx.objectStore('routes').put(route);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('קישור ההתראה לא נשמר.'));tx.onabort=()=>reject(new Error('קישור ההתראה לא נשמר.'));}).finally(()=>db.close());
}
export async function removePushRoute(id:string) {
  const db=await openDatabase();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('routes','readwrite');tx.objectStore('routes').delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('לא ניתן לעדכן את ההעדפות.'));}).finally(()=>db.close());
}
export async function readPushRoutes():Promise<PushRoute[]> {
  const db=await openDatabase();try{return await new Promise((resolve,reject)=>{const request=db.transaction('routes').objectStore('routes').getAll();request.onsuccess=()=>resolve((request.result as PushRoute[]).filter(row=>/^customer:[a-f0-9-]{36}$/.test(row.id)&&/^\/order\/[a-f0-9]{64}$/.test(row.path)));request.onerror=()=>reject(new Error('לא ניתן לקרוא קישורים שמורים.'));});}finally{db.close();}
}
export function getPushDeviceSecret(create=false) {
  try{let secret=localStorage.getItem('yachad-push-device-v1');if(secret&&/^[a-f0-9]{64}$/.test(secret))return secret;
    if(!create)return null;secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');localStorage.setItem('yachad-push-device-v1',secret);if(localStorage.getItem('yachad-push-device-v1')!==secret)throw Error();return secret;
  }catch{throw new Error('האחסון במכשיר חסום. מעקב ההזמנה באתר ממשיך לעבוד.');}
}
