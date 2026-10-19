import { createECDH, createHash, timingSafeEqual } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import https from 'node:https';

export function validatePushEndpoint(endpoint) {
  if(typeof endpoint!=='string'||endpoint.length>2048)throw new Error('INVALID_PUSH_ENDPOINT');
  const url=new URL(endpoint);
  const approved=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(url.hostname)||/^([a-z0-9-]+\.)*notify\.windows\.com$/.test(url.hostname);
  if(url.protocol!=='https:'||!approved||url.username||url.password||url.port||url.hash||isIP(url.hostname)||url.pathname==='/')throw new Error('INVALID_PUSH_ENDPOINT');
  return url;
}
export function isPublicAddress(address) {
  if(isIP(address)===4){const n=address.split('.').map(Number);return !(n[0]===0||n[0]===10||n[0]===127||n[0]>=224||n[0]===169&&n[1]===254||n[0]===172&&n[1]>=16&&n[1]<=31||n[0]===192&&[0,168].includes(n[1])||n[0]===100&&n[1]>=64&&n[1]<=127||n[0]===198&&[18,19].includes(n[1]));}
  if(isIP(address)===6){const ip=address.toLowerCase();return /^2[0-9a-f]{3}:/.test(ip)&&!ip.startsWith('2001:db8:');}
  return false;
}
// Pin the checked DNS result to the actual TLS socket. No redirect following,
// private IPs, arbitrary hosts, incoming request headers or socket-only deadline.
export async function pushHttpsTransport(details) {
  const url=validatePushEndpoint(details.endpoint);
  let dnsTimer;
  const addresses=await Promise.race([lookup(url.hostname,{all:true}),new Promise((_,reject)=>{dnsTimer=setTimeout(()=>reject(new Error('PUSH_DNS_TIMEOUT')),4000);})]).finally(()=>clearTimeout(dnsTimer));
  if(!addresses.length||addresses.some(row=>!isPublicAddress(row.address)))throw new Error('UNSAFE_PUSH_DNS');
  const chosen=addresses[0];
  const agent=new https.Agent({keepAlive:false,lookup:(_hostname,options,callback)=>{if(typeof options==='object'&&options.all)callback(null,[chosen]);else callback(null,chosen.address,chosen.family);}});
  return new Promise((resolve,reject)=>{
    const request=https.request(url,{method:'POST',headers:details.headers,agent},response=>{
      response.resume();response.on('end',()=>resolve({statusCode:response.statusCode??500,headers:{'retry-after':response.headers['retry-after']}}));
    });
    const deadline=setTimeout(()=>request.destroy(new Error('PUSH_DEADLINE')),8000);
    request.setTimeout(6000,()=>request.destroy(new Error('PUSH_SOCKET_TIMEOUT')));
    request.on('error',reject);request.on('close',()=>{clearTimeout(deadline);agent.destroy();});request.end(details.body);
  });
}
export function makePushSender({webpush,vapid,transport=pushHttpsTransport}) {
  if(!vapid?.publicKey||!vapid.privateKey||!/^https:\/\/|^mailto:/.test(vapid.subject??''))throw new Error('PUSH_CONFIG_REQUIRED');
  const pair=createECDH('prime256v1');pair.setPrivateKey(Buffer.from(vapid.privateKey,'base64url'));
  if(pair.getPublicKey().toString('base64url')!==vapid.publicKey)throw new Error('PUSH_KEY_MISMATCH');
  return async ({subscription,payload,ttl})=>{
    const endpoint=validatePushEndpoint(subscription?.endpoint);
    if(!payload||payload.version!==1||!['owner_new_order','customer_approved'].includes(payload.kind)||!['eventId','orderId'].every(key=>/^[a-f0-9-]{36}$/.test(payload[key]??'')))throw new Error('INVALID_PUSH_PAYLOAD');
    const safePayload={version:1,eventId:payload.eventId,orderId:payload.orderId,kind:payload.kind};
    const topic=createHash('sha256').update(payload.eventId).digest('base64url').slice(0,32);
    const details=webpush.generateRequestDetails({endpoint:endpoint.href,keys:subscription.keys},JSON.stringify(safePayload),{vapidDetails:{subject:vapid.subject,publicKey:vapid.publicKey,privateKey:vapid.privateKey},TTL:Math.min(3600,Math.max(1,Number(ttl)||300)),urgency:'high',topic,contentEncoding:'aes128gcm'});
    return transport(details);
  };
}
function retrySeconds(headers={}){const raw=headers['retry-after'];if(!raw)return 0;const seconds=Number(raw);return Math.min(3600,Math.max(0,Number.isFinite(seconds)?seconds:Math.ceil((Date.parse(raw)-Date.now())/1000)));}
export async function drainPush({rpc,send,publicKey,batchSize=20}) {
  const config=await rpc('get_bakery_push_config',{});
  if(!config?.enabled||config.publicKey!==publicKey)return {disabled:true,processed:0};
  const summary={processed:0,sent:0,retry:0,failed:0,skipped:0};
  const deadline=Date.now()+45000;
  // Claim a fresh lease for the current wave only. Never let a batch wait in
  // memory while its lease expires behind slow network/RPC calls.
  while(summary.processed<Math.min(50,batchSize)&&Date.now()+35000<deadline){
  const jobs=await rpc('claim_bakery_push',{p_limit:Math.min(4,batchSize-summary.processed)});
  if(!jobs.length)break;
  await Promise.all(jobs.map(async job=>{
    let code=0,wait=0;
    const delivery=await rpc('prepare_bakery_push',{p_id:job.id,p_lease_token:job.leaseToken});
    if(delivery){try{const response=await send(delivery);code=response.statusCode;wait=retrySeconds(response.headers);}catch(error){code=error.message?.startsWith('INVALID_')||error.message==='UNSAFE_PUSH_DNS'?400:-1;}}
    const saved=await rpc('finish_bakery_push',{p_id:job.id,p_lease_token:job.leaseToken,p_code:code,p_retry_seconds:wait});
    if(saved){summary.processed++;if(code>=200&&code<300)summary.sent++;else if(!code)summary.skipped++;else if(code===429||code>=500||code===-1)summary.retry++;else summary.failed++;}
  }));
  }
  return summary;
}
export function createDispatchHandler({secret,run}) {
  return async request=>{
    if(!secret||secret.length<32)return Response.json({error:'Not configured'},{status:503});
    if(request.method!=='POST')return new Response(null,{status:405});
    const supplied=request.headers.get('x-bakery-push-worker-key')??'';
    const expectedHash=createHash('sha256').update(secret).digest(),suppliedHash=createHash('sha256').update(supplied).digest();
    if(!timingSafeEqual(expectedHash,suppliedHash))return Response.json({error:'Unauthorized'},{status:401});
    try{return Response.json(await run(),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Push dispatch incomplete; queued deliveries retained'},{status:503});}
  };
}
