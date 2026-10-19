// Loopback-only gateway for real local PostgreSQL business logic.
// Supabase Auth transport and Realtime are simulated; SQL, RLS and persistence are real.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {openDatabase,replaceFixture,asRole,rpc,OWNER,PROJECT,sourceFingerprint}=require('./local-db/database.cjs');
const PUBLIC_PORT=4320,ADMIN_PORT=4321,sessions=new Map(),refreshTokens=new Map();let control={},db,push;
const knownOrigins=new Set([`http://127.0.0.1:${PUBLIC_PORT}`,`http://127.0.0.1:${ADMIN_PORT}`]);
const publishedKey='sb_publishable_local_review_only_not_a_real_key';
const tables=new Set(['admin_users','categories','products','product_option_groups','product_options','store_settings','orders','order_items','order_item_options','order_status_history','order_attention','audit_log']);
const injection=`<script>(()=>{const original=window.fetch.bind(window);window.fetch=(input,init)=>{const u=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);if(u.hostname==='utyzqpjjjwjkkdlepkag.supabase.co'){const local='/__local/api'+u.pathname+u.search;return original(input instanceof Request?new Request(local,input):local,init)}return original(input,init)};window.WebSocket=class{static OPEN=1;static CONNECTING=0;static CLOSED=3;readyState=3;close(){}send(){}addEventListener(){}removeEventListener(){}};})();</script>`;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
function user(){return {id:OWNER,aud:'authenticated',role:'authenticated',email:'owner@local.bakery.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-10-19T00:00:00Z'};}
function issueSession(){const exp=Math.floor(Date.now()/1000)+3600;const access_token=[{alg:'HS256',typ:'JWT'},{sub:OWNER,aud:'authenticated',role:'authenticated',exp,iat:exp-3600,session_id:crypto.randomUUID()}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.'+crypto.randomBytes(32).toString('base64url');const refresh_token=crypto.randomBytes(32).toString('hex');sessions.set(access_token,OWNER);refreshTokens.set(refresh_token,OWNER);return {access_token,refresh_token,token_type:'bearer',expires_in:3600,expires_at:exp,user:user()};}
async function readBody(req){let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>128000)throw Error('BODY_TOO_LARGE');}return body?JSON.parse(body):{};}
function roleFor(req){const bearer=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(sessions.has(bearer))return {role:'authenticated',uid:sessions.get(bearer)};if(!bearer||bearer===publishedKey)return {role:'anon',uid:null};throw Object.assign(Error('Invalid local session'),{code:'PGRST301'});}
async function reset(){control={};await db.exec('truncate public.orders restart identity cascade; delete from private.bakery_push_devices; alter sequence public.bakery_order_number_seq restart with 1001; delete from public.fulfillment_slot_overrides;');push?.reset();await replaceFixture(db);await db.exec("update public.fulfillment_hours set enabled=iso_weekday<>6,opens_at='05:00',closes_at=case when iso_weekday in(5,6) then time '16:00' else time '21:00' end,slot_interval_minutes=30,default_capacity=case when service_type='pickup' then 8 else 6 end;");}
function clauses(url,values){const where=[];for(const [column,value]of url.searchParams){if(['select','order','limit','offset'].includes(column))continue;if(!/^[a-z_]+$/.test(column))throw Error('Invalid filter');if(value.startsWith('eq.')){values.push(value.slice(3));where.push(`${column}=$${values.length}`);}else if(value.startsWith('in.(')&&value.endsWith(')')){const list=value.slice(4,-1).split(',').map(s=>s.replace(/^"|"$/g,''));where.push(`${column} in (${list.map(x=>{values.push(x);return '$'+values.length}).join(',')})`);}else throw Error('Unsupported local filter');}return where.length?' where '+where.join(' and '):'';}
async function rest(req,url,body){const table=url.pathname.split('/').pop();if(!tables.has(table))throw Error('Unknown local table');const {role,uid}=roleFor(req);return asRole(db,role,uid,async tx=>{
 const columns=url.searchParams.get('select')||'*';if(columns!=='*'&&!columns.split(',').every(s=>/^[a-z_]+$/.test(s)))throw Error('Invalid local selection');
 const values=[];const where=clauses(url,values);
 if(req.method==='GET'){
  const order=url.searchParams.get('order');let sort='';if(order){const fields=order.split(',');if(!fields.every(x=>/^[a-z_]+\.(asc|desc)(\.nulls(first|last))?$/.test(x)))throw Error('Invalid ordering');sort=' order by '+fields.map(x=>{const [col,dir]=x.split('.');return col+' '+dir}).join(',');}
  const limit=Math.min(Math.max(Number(url.searchParams.get('limit')||1000),0),1000),offset=Math.max(Number(url.searchParams.get('offset')||0),0);if(!Number.isInteger(limit)||!Number.isInteger(offset))throw Error('Invalid range');
  return (await tx.query(`select ${columns} from public.${table}${where}${sort} limit ${limit} offset ${offset}`,values)).rows;
 }
 if(req.method==='PATCH'&&['products','store_settings'].includes(table)){
  if(!where)throw Error('A local update needs a row filter');const keys=Object.keys(body);if(!keys.length||!keys.every(k=>/^[a-z_]+$/.test(k)))throw Error('Invalid update');const count=values.length;values.push(...keys.map(k=>body[k]));return (await tx.query(`update public.${table} set ${keys.map((k,i)=>`${k}=$${count+i+1}`).join(',')}${where} returning ${columns}`,values)).rows;
 }
 throw Object.assign(Error('Local method blocked'),{code:'42501'});
});}
async function handler(req,res,admin){const url=new URL(req.url,'http://127.0.0.1');const json=(data,status=200)=>{if(res.destroyed)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};try{
 if(req.headers.origin&&!knownOrigins.has(req.headers.origin)){res.writeHead(403).end();return;}
 if(url.pathname.startsWith('/__local/')){
  const body=['POST','PATCH'].includes(req.method)?await readBody(req):{};
  if(url.pathname==='/__local/reset'&&req.method==='POST'){await reset();return json({ok:true});}
  if(url.pathname==='/__local/push/state')return json(await push.state());
  if(url.pathname==='/__local/push/fixture')return json(push.makeFixture());
  if(url.pathname==='/__local/push/drain'&&req.method==='POST')return json(await push.run());
  if(url.pathname==='/__local/control'&&req.method==='POST'){
   Object.assign(control,body.control||{});
   if(body.labOpen)await db.exec("update public.fulfillment_hours set enabled=true,opens_at='00:00',closes_at='23:59:59' where service_type='delivery';");
   if(body.settings){const keys=Object.keys(body.settings).filter(k=>['ordering_enabled','delivery_enabled','pickup_enabled','delivery_fee_agorot','minimum_delivery_subtotal_agorot'].includes(k));if(keys.length)await db.query('update public.store_settings set '+keys.map((k,i)=>k+'=$'+(i+1)).join(',')+" where id='default'",keys.map(k=>body.settings[k]));}
   if(body.product){const keys=Object.keys(body.product).filter(k=>['price_agorot','active','available_today','available_for_delivery','available_for_pickup'].includes(k));if(keys.length)await db.query('update public.products set '+keys.map((k,i)=>k+'=$'+(i+2)).join(',')+' where id=$1',[body.product.id,...keys.map(k=>body.product[k])]);}
   return json({ok:true});
  }
  if(url.pathname==='/__local/state')return json({sourceFingerprint,orders:(await db.query('select id,order_number,status,payment_status,total_agorot,updated_at from public.orders order by order_number')).rows,attention:(await db.query('select order_id,acknowledged_at from public.order_attention')).rows,control});
  if(url.pathname.startsWith('/__local/api/auth/v1/')){
   if(url.pathname.endsWith('/token')&&req.method==='POST'){
    if(url.searchParams.get('grant_type')==='refresh_token'&&refreshTokens.has(body.refresh_token))return json(issueSession());
    if(body.email!=='owner@local.bakery.invalid'||body.password!=='local-review-only')return json({error:'invalid_grant',msg:'Local demo login only'},400);
    return json(issueSession());
   }
   const auth=roleFor(req);if(auth.role!=='authenticated')return json({message:'Local login required'},401);
   if(url.pathname.endsWith('/user'))return json(user());
   if(url.pathname.endsWith('/logout')){sessions.delete((req.headers.authorization||'').replace(/^Bearer\s+/i,''));return json({});}
  }
  if(url.pathname.startsWith('/__local/api/rest/v1/rpc/')){
   if(req.method!=='POST')return json({message:'Local RPC requires POST'},405);
   const name=url.pathname.split('/').pop(),auth=roleFor(req);
   if((name==='get_bakery_order_attention'&&control.failAttention)||(['get_bakery_pickup_slots','get_admin_pickup_slots'].includes(name)&&control.failSlots)||(name==='get_bakery_order_status'&&control.failTracking))return json({message:'Simulated connection failure'},503);
   if(name==='acknowledge_bakery_order'&&control.failAck)return json({message:'Simulated acknowledgment failure'},503);
   if(name==='create_bakery_order'&&control.createDelay)await new Promise(r=>setTimeout(r,Math.min(control.createDelay,20000)));
   const result=await rpc(db,name,body,auth.role,auth.uid);
   if(name==='get_bakery_push_config'&&result)result.localOnly=true;
   if(name==='create_bakery_order'&&control.loseCreateResponseOnce){control.loseCreateResponseOnce=false;return json({message:'Simulated lost response after commit'},503);}
   if(name==='create_bakery_order'&&control.responseDelay)await new Promise(r=>setTimeout(r,Math.min(control.responseDelay,20000)));
   return json(result);
  }
  if(url.pathname.startsWith('/__local/api/rest/v1/')){
   if(control.failCatalog&&['products','categories','product_option_groups','product_options','store_settings'].includes(url.pathname.split('/').pop()))return json({message:'Simulated read failure'},503);
   const rows=await rest(req,url,body);return json((req.headers.accept||'').includes('application/vnd.pgrst.object')?rows[0]??null:rows);
  }
  return json({message:'Unknown local endpoint'},404);
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
 const dist=path.join(PROJECT,admin?'admin-dashboard/dist':'dist');let relative=decodeURIComponent(url.pathname),tracking=!admin&&/^\/order\/[^/]+\/?$/.test(relative);
 let file=path.resolve(dist,tracking?'order/index.html':'.'+relative);if(file!==dist&&!file.startsWith(dist+path.sep)){res.writeHead(403).end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 let exists=fs.existsSync(file)&&fs.statSync(file).isFile();if(admin&&!exists&&['/','/login','/orders','/products','/settings'].includes(relative)){file=path.join(dist,'index.html');exists=fs.existsSync(file);}
 const status=exists?200:404;if(!exists)file=path.join(dist,'404.html');if(!fs.existsSync(file)){res.writeHead(404).end('Not found');return;}
 res.statusCode=status;res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"connect-src 'self'; form-action 'self'; base-uri 'self'");if(tracking)res.setHeader('X-Robots-Tag','noindex,nofollow,noarchive');
 if(path.extname(file)==='.html')return res.end(fs.readFileSync(file,'utf8').replace('<head>','<head>'+injection).replace('<body>','<body><div style="background:#fff0c7;color:#5b3b11;padding:5px 12px;text-align:center;font:600 14px Assistant,sans-serif;direction:rtl">סביבת בדיקה מקומית בלבד — ללא סליקה או הזמנה לעסק החי</div>'));
 if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
}catch(error){json({code:error.code||'LOCAL_ERROR',message:error.message},error.code==='42501'?403:400);}}
(async()=>{db=await openDatabase();push=await require('./push-tools/local-push.cjs').createLocalPush(db,()=>control);const servers=[http.createServer((req,res)=>void handler(req,res,false)).listen(PUBLIC_PORT,'127.0.0.1'),http.createServer((req,res)=>void handler(req,res,true)).listen(ADMIN_PORT,'127.0.0.1')];console.log('Local SQL orders: http://127.0.0.1:4320/shop | admin http://127.0.0.1:4321/orders');let closing=false;async function close(){if(closing)return;closing=true;for(const server of servers)server.close();push?.close();await db.close();process.exit(0);}process.on('SIGINT',close);process.on('SIGTERM',close);})().catch(error=>{console.error('Local SQL gateway failed:',error.message);process.exitCode=1});
