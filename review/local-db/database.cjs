const {PGlite}=require('@electric-sql/pglite');
const {pgcrypto}=require('@electric-sql/pglite/contrib/pgcrypto');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PROJECT=path.resolve(__dirname,'../../project');
const OWNER='11111111-1111-4111-8111-111111111111',MANAGER='22222222-2222-4222-8222-222222222222',OUTSIDER='33333333-3333-4333-8333-333333333333',INACTIVE='44444444-4444-4444-8444-444444444444';
const fixturePath=process.env.BAKERY_LOCAL_FIXTURE_PATH||path.resolve(__dirname,'../public-fixture-20261019.json');
const fixture=()=>JSON.parse(fs.readFileSync(fixturePath,'utf8'));
const sourceFiles=['supabase/tests/local/bootstrap.sql',...fs.readdirSync(path.join(PROJECT,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort().map(f=>'supabase/migrations/'+f),'supabase/changes/web-push.sql','supabase/seed.sql'];
const sourceFingerprint=crypto.createHash('sha256').update(sourceFiles.map(f=>f+'\n'+fs.readFileSync(path.join(PROJECT,f),'utf8')).join('\n')).update(fs.readFileSync(fixturePath)).digest('hex');
async function replaceFixture(db){
 const data=fixture();
 await db.transaction(async tx=>{
  await tx.exec('delete from public.product_option_groups;');
  if(process.env.BAKERY_LOCAL_FIXTURE_PATH)await tx.exec('update public.products set active=false; update public.categories set active=false;');
  for(const row of data.categories)await tx.query('insert into public.categories(id,name_he,sort_order,active) values($1,$2,$3,true) on conflict(id) do update set name_he=excluded.name_he,active=true',[row.id,row.name_he,row.sort_order]);
  for(const row of data.products){const keys=Object.keys(row).filter(k=>/^[a-z_]+$/.test(k)&&!['created_at','updated_at'].includes(k));await tx.query(`insert into public.products(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) on conflict(id) do update set ${keys.filter(k=>k!=='id').map(k=>k+'=excluded.'+k).join(',')}`,keys.map(k=>row[k]));}
  for(const [table,rows]of [['product_option_groups',data.product_option_groups],['product_options',data.product_options]])for(const row of rows){const keys=Object.keys(row).filter(k=>/^[a-z_]+$/.test(k)&&!['created_at','updated_at'].includes(k));await tx.query(`insert into public.${table}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,keys.map(k=>row[k]));}
  const settings={...data.store_settings,id:'default'};const keys=Object.keys(settings).filter(k=>k!=='id'&&k!=='updated_at');await tx.query(`update public.store_settings set ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} where id='default'`,keys.map(k=>settings[k]));
 });
}
async function openDatabase({memory=false,dir=path.join(__dirname,'data-'+sourceFingerprint.slice(0,12))}={}){
 const db=new PGlite(memory?{extensions:{pgcrypto}}:{dataDir:dir,extensions:{pgcrypto}});await db.waitReady;
 const initialized=(await db.query("select to_regclass('public.order_attention') as table_name")).rows[0].table_name;
 if(!initialized){
  const bootstrap=fs.readFileSync(path.join(PROJECT,'supabase/tests/local/bootstrap.sql'),'utf8').replace(/^\\.*$/mg,'').replace('create extension if not exists pgcrypto;','create schema if not exists extensions; create extension if not exists pgcrypto with schema extensions;');await db.exec(bootstrap);
  for(const file of fs.readdirSync(path.join(PROJECT,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()){try{await db.exec(fs.readFileSync(path.join(PROJECT,'supabase/migrations',file),'utf8'));}catch(e){throw new Error('Migration '+file+': '+e.message,{cause:e});}}
  await db.exec(fs.readFileSync(path.join(PROJECT,'supabase/changes/web-push.sql'),'utf8'));
  await db.exec(fs.readFileSync(path.join(PROJECT,'supabase/seed.sql'),'utf8'));
  for(const id of [OWNER,MANAGER,OUTSIDER,INACTIVE])await db.query('insert into auth.users(id) values($1)',[id]);
  await db.query("insert into public.admin_users(user_id,display_name,role,active) values($1,'בעלים לבדיקה','owner',true),($2,'מנהל בדיקה','manager',true),($3,'מנהל לא פעיל','manager',false)",[OWNER,MANAGER,INACTIVE]);
  await replaceFixture(db);
  await db.exec('create schema local_validation; create table local_validation.source_manifest(fingerprint text not null);');
  await db.query('insert into local_validation.source_manifest values($1)',[sourceFingerprint]);
 }else{
  const manifestExists=(await db.query("select to_regclass('local_validation.source_manifest') as name")).rows[0].name;
  if(!manifestExists||(await db.query('select fingerprint from local_validation.source_manifest')).rows[0]?.fingerprint!==sourceFingerprint){await db.close();throw Error('Local database SQL/seed differs from current source. Use a fresh local data directory.');}
 }
 return db;
}
async function asRole(db,role,uid,operation){
 if(!['anon','authenticated','service_role'].includes(role))throw Error('Invalid local role');
 return db.transaction(async tx=>{await tx.exec('set local role '+role);await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid||'']);return operation(tx);});
}
async function rpc(db,name,args,role='anon',uid=null){
 const definitions={
  retire_bakery_push_device:['p_endpoint','p_device_secret'],clear_bakery_owner_push:[],
  get_bakery_push_config:[],register_bakery_push:['p_audience','p_tracking_token','p_endpoint','p_keys','p_device_secret','p_application_key'],get_bakery_push_binding:['p_audience','p_tracking_token','p_endpoint','p_device_secret'],remove_bakery_push:['p_audience','p_tracking_token','p_endpoint','p_device_secret'],claim_bakery_push:['p_limit'],prepare_bakery_push:['p_id','p_lease_token'],finish_bakery_push:['p_id','p_lease_token','p_code','p_retry_seconds'],
  get_bakery_pickup_slots:['p_days'],create_bakery_order:['p_idempotency_key','p_tracking_token','p_fulfillment_type','p_requested_pickup_at','p_customer_name','p_phone','p_delivery_address','p_customer_notes','p_items','p_expected_total_agorot'],get_bakery_order_status:['p_tracking_token'],transition_bakery_order:['p_order_id','p_expected_updated_at','p_to_status','p_reason'],get_admin_pickup_slots:['p_days'],set_pickup_slot_override:['p_starts_at','p_enabled','p_capacity'],get_bakery_order_attention:['p_after_number','p_limit'],acknowledge_bakery_order:['p_order_id']
 };
 const keys=definitions[name];if(!keys)throw Error('Unknown local RPC');
 const selected=keys.filter(k=>Object.hasOwn(args,k)),params=selected.map(k=>typeof args[k]==='object'&&args[k]!==null?JSON.stringify(args[k]):args[k]);
 return asRole(db,role,uid,async tx=>{const scalar=['get_bakery_order_status','get_bakery_push_config','register_bakery_push','get_bakery_push_binding','remove_bakery_push','retire_bakery_push_device','clear_bakery_owner_push','claim_bakery_push','prepare_bakery_push','finish_bakery_push'].includes(name);const sql=scalar?`select public.${name}(${selected.map((k,i)=>`${k} := $${i+1}`).join(',')}) as value`:`select * from public.${name}(${selected.map((k,i)=>`${k} := $${i+1}`).join(',')})`;const result=await tx.query(sql,params);return scalar?result.rows[0]?.value??null:result.rows;});
}
module.exports={openDatabase,replaceFixture,asRole,rpc,OWNER,MANAGER,OUTSIDER,INACTIVE,PROJECT,sourceFingerprint};
