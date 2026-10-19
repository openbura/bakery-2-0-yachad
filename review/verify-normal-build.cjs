const assert=require('node:assert/strict');
process.env.VITE_BAKERY_SUPABASE_URL='https://utyzqpjjjwjkkdlepkag.supabase.co';
process.env.VITE_BAKERY_SUPABASE_PUBLISHABLE_KEY='sb_publishable_local_review_only_not_a_real_key';
process.env.VITE_BAKERY_ONLINE_ORDERS_ENABLED='true';
delete process.env.VITE_BAKERY_REVIEW_ONLY;
(async()=>{const {build}=await import('../project/node_modules/vite/dist/node/index.js');const result=await build({logLevel:'error',build:{write:false,copyPublicDir:false}});const outputs=(Array.isArray(result)?result:[result]).flatMap(x=>x.output);const chunks=outputs.filter(x=>x.type==='chunk');const shop=chunks.find(x=>x.fileName.includes('ShopPage-'));assert.ok(shop);assert.ok(!shop.code.includes('https://wa.me/'));assert.ok(chunks.some(x=>x.code.includes('create_bakery_order')));assert.ok(chunks.some(x=>x.fileName.includes('OrderTrackingPage-')));assert.ok(!chunks.some(x=>x.code.includes('/__review/order')));console.log('PASS: normal build uses order RPC and private tracking route; no WhatsApp order handoff. Memory-only build with dummy key; no deploy.');})().catch(e=>{console.error(e.message);process.exitCode=1});
