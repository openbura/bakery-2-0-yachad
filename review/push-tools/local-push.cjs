const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const webpush=require('web-push');
const {rpc,PROJECT}=require('../local-db/database.cjs');
module.exports.createLocalPush=async function(db,getControl){
 const core=await import(pathToFileURL(path.join(PROJECT,'supabase/functions/_shared/push-dispatch.mjs')).href);
 const secretDir=path.join(__dirname,'secrets'),keyFile=path.join(secretDir,'local-vapid.json');fs.mkdirSync(secretDir,{recursive:true});
 if(!fs.existsSync(keyFile))fs.writeFileSync(keyFile,JSON.stringify({...webpush.generateVAPIDKeys(),subject:'https://bakery-2-0-yachad-deploy.vercel.app'}),{mode:0o600});
 const vapid=JSON.parse(fs.readFileSync(keyFile,'utf8'));await db.query('update private.bakery_push_config set enabled=true,public_key=$1 where singleton',[vapid.publicKey]);
 let busy=false,messages=[],lastError=false;
 const transport=async details=>{
  // NEVER call fetch/https here. Real encryption/VAPID run before this boundary.
  if(!details.headers.Authorization&&!details.headers.authorization)throw Error('Missing VAPID');
  return{statusCode:Number(getControl().pushStatus)||201,headers:{'retry-after':getControl().pushRetryAfter||'0'},encryptedBytes:details.body.length};
 };
 const preparedSend=core.makePushSender({webpush,vapid,transport});
 const send=async delivery=>{const response=await preparedSend(delivery);messages.push({payload:delivery.payload,statusCode:response.statusCode,encryptedBytes:response.encryptedBytes,network:'BLOCKED_LOCAL_CAPTURE',at:new Date().toISOString()});return response;};
 const run=async()=>{if(busy)return{busy:true};busy=true;try{const result=await core.drainPush({rpc:(name,args)=>rpc(db,name,args,'service_role'),send,publicKey:vapid.publicKey});lastError=false;return result;}catch{lastError=true;return{error:'LOCAL_PUSH_RETRY_PENDING'};}finally{busy=false;}};
 const timer=setInterval(()=>{if(!getControl().pushPaused)void run();},1500);timer.unref();
 return{run,close:()=>clearInterval(timer),reset:()=>{messages=[];lastError=false;},state:async()=>({transport:'LOCAL_CAPTURE_NO_OUTBOUND_PUSH',lastError,messages,events:(await db.query('select id,order_id,kind from private.bakery_push_events order by created_at')).rows,deliveries:(await db.query('select id,event_id,status,attempts,last_code from private.bakery_push_deliveries order by next_at')).rows,bindings:Number((await db.query('select count(*) n from private.bakery_push_bindings')).rows[0].n)}),makeFixture:()=>{const pair=crypto.createECDH('prime256v1');pair.generateKeys();return{endpoint:'https://fcm.googleapis.com/fcm/send/local-'+crypto.randomUUID(),keys:{p256dh:pair.getPublicKey().toString('base64url'),auth:crypto.randomBytes(16).toString('base64url')}};}};
};
