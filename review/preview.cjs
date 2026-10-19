const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'project/dist');
const snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'public-fixture-20261019.json'),'utf8'));
let data,control={};
function reset(){data=structuredClone(snapshot);data.categories.forEach(c=>c.active=true);data.store_settings.id='default';control={};}reset();
const injection=`<script>(()=>{const original=window.fetch.bind(window);window.fetch=(input,init)=>{const u=new URL(typeof input==='string'?input:input.url,location.href);if(u.hostname==='utyzqpjjjwjkkdlepkag.supabase.co')return original('/__review/api'+u.pathname+u.search,init);return original(input,init)};window.WebSocket=class{static OPEN=1;static CONNECTING=0;static CLOSED=3;readyState=3;close(){}send(){}addEventListener(){}removeEventListener(){}};})();</script>`;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.woff2':'font/woff2','.json':'application/json','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 const json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
 if(url.pathname.startsWith('/__review/')){
  if(url.pathname==='/__review/reset'&&req.method==='POST'){reset();return json({ok:true})}
  if(url.pathname==='/__review/control'&&req.method==='POST'){
   let body='';for await(const chunk of req){body+=chunk;if(body.length>300000){res.writeHead(413).end();return}}
   const p=JSON.parse(body||'{}');if(p.reset)reset();if(p.settings)Object.assign(data.store_settings,p.settings);if(p.product)Object.assign(data.products.find(x=>x.id===p.product.id)||{},p.product);if(p.products)data.products=p.products;if(p.categories)data.categories=p.categories;if(p.groups)data.product_option_groups=p.groups;if(p.options)data.product_options=p.options;Object.assign(control,p.control||{});return json({ok:true});
  }
  if(url.pathname==='/__review/state')return json({data,control});
  if(url.pathname==='/__review/order'){
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'"});
   return res.end('<html lang="he" dir="rtl"><meta charset="utf-8"><title>הזמנת בדיקה מקומית</title><body><h1>הזמנת בדיקה — לא נשלחה</h1><p>זהו סיכום מקומי בלבד. לא נוצרה הזמנה ולא נפתח וואטסאפ אמיתי.</p><pre id="summary" style="white-space:pre-wrap"></pre><a href="/shop">חזרה לחנות</a><script>document.getElementById("summary").textContent=new URL(location.href).searchParams.get("text")||""</script></body></html>');
  }
  if(url.pathname==='/__review/alerts'){
   const file=path.join(__dirname,'owner-alert-demo.html');if(!fs.existsSync(file)){res.writeHead(404).end();return}res.setHeader('Content-Type','text/html; charset=utf-8');return fs.createReadStream(file).pipe(res);
  }
  if(url.pathname.startsWith('/__review/api/rest/v1/')){
   if(req.method!=='GET')return json({message:'Review API is read only'},405);
   if(control.delay)await new Promise(resolve=>setTimeout(resolve,Math.min(control.delay,30000)));
   if(control.fail)return json({message:'Simulated connection failure'},503);
   const table=url.pathname.split('/').pop();let rows=table==='store_settings'?[data[table]]:data[table];if(!rows)return json({message:'Unknown review table'},404);
   for(const [key,value]of url.searchParams)if(value.startsWith('eq.'))rows=rows.filter(row=>String(row[key])===value.slice(3));
   return json((req.headers.accept||'').includes('application/vnd.pgrst.object')?rows[0]??null:rows);
  }
  return json({message:'No external action permitted'},404);
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return}
 let file=path.resolve(dist,'.'+decodeURIComponent(url.pathname));
 if(file!==dist&&!file.startsWith(dist+path.sep)){res.writeHead(403).end();return}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 const found=fs.existsSync(file)&&fs.statSync(file).isFile();const status=found?200:404;if(!found)file=path.join(dist,'404.html');
 if(!fs.existsSync(file)){res.writeHead(503).end('Build the local review first');return}
 res.statusCode=status;res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"connect-src 'self'; form-action 'self'");
 if(path.extname(file)==='.html')return res.end(fs.readFileSync(file,'utf8').replace('<head>','<head>'+injection));
 if(req.method==='HEAD')return res.end();fs.createReadStream(file).on('error',()=>res.end()).pipe(res);
}).listen(4310,'127.0.0.1',()=>console.log('Safe local review: http://127.0.0.1:4310/shop — fixture data only'));
