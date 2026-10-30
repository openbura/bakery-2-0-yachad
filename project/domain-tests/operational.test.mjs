import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePriceInput, saleUnit, unitPrice, lineTotal, orderTotals, priceProductSelections } from '../admin-dashboard/src/domain/pricing.ts';
import { readCheckoutSession, resolveFulfillment, checkoutStorageKey, checkoutDraftStorageKey, readCheckoutDraft, writeCheckoutDraft, emptyCheckoutDraft } from '../src/shop/checkoutSession.ts';
import { normalizeIsraeliPhone } from '../src/shop/phone.ts';
import { persistOrderIntent, readOrderIntent, rememberOrderReceipt, clearOrderIntent, readOrderReceipt, orderIntentKey, orderReceiptKey } from '../src/shop/orderSubmission.ts';
import { traySelectionError, trayFillings } from '../src/shop/cateringTray.ts';
import { deliveryFeeFor, deliveryAreas } from '../src/shop/deliveryPolicy.ts';
import { isBakeryOpen } from '../src/shop/openingHours.ts';

test('orders follow published Israel hours including night, Friday boundary and Saturday', () => {
  assert.equal(isBakeryOpen(new Date('2026-10-28T04:00:00+02:00')), false);
  assert.equal(isBakeryOpen(new Date('2026-10-28T04:59:59+02:00')), false);
  assert.equal(isBakeryOpen(new Date('2026-10-28T05:00:00+02:00')), true);
  assert.equal(isBakeryOpen(new Date('2026-10-28T20:59:59+02:00')), true);
  assert.equal(isBakeryOpen(new Date('2026-10-28T21:00:00+02:00')), false);
  assert.equal(isBakeryOpen(new Date('2026-10-30T15:59:59+02:00')), true);
  assert.equal(isBakeryOpen(new Date('2026-10-30T16:00:00+02:00')), false);
  assert.equal(isBakeryOpen(new Date('2026-10-31T12:00:00+02:00')), false);
});

test('catering mix must allocate exactly twelve sandwiches from the five owner fillings', () => {
  const mode={groupCode:'tray-mode',optionCode:'mixed'};
  const choices=trayFillings.flatMap((f,i)=>Array.from({length:i<2?3:2},()=>({groupCode:'tray-mix',optionCode:f.code})));
  assert.equal(choices.length,12);assert.equal(traySelectionError([mode,...choices]),undefined);
  for(const count of [0,1,11,13])assert.ok(traySelectionError([mode,...Array.from({length:count},()=>choices[0])]));
  assert.ok(traySelectionError([mode,...choices.slice(0,11),{groupCode:'tray-mix',optionCode:'unknown'}]));
  assert.ok(traySelectionError([mode,...choices,{groupCode:'tray-single',optionCode:'tuna-salad'}]));
  assert.equal(traySelectionError([mode,...Array.from({length:12},()=>choices[0])]),undefined);
});

test('single filling tray allows only one filling and rejects stale mixed allocations', () => {
  const mode={groupCode:'tray-mode',optionCode:'single'};
  for(const filling of trayFillings)assert.equal(traySelectionError([mode,{groupCode:'tray-single',optionCode:filling.code}]),undefined);
  assert.ok(traySelectionError([mode]));assert.ok(traySelectionError([]));
  assert.ok(traySelectionError([mode,{groupCode:'tray-single',optionCode:'tuna-salad'},{groupCode:'tray-single',optionCode:'egg-salad'}]));
  assert.ok(traySelectionError([mode,{groupCode:'tray-single',optionCode:'tuna-salad'},{groupCode:'tray-mix',optionCode:'tuna-salad'}]));
});

test('owner delivery prices depend on locality and pickup adds no delivery charge', () => {
  assert.equal(deliveryFeeFor('delivery','kfar-saba'),2000);
  for(const area of deliveryAreas.filter(a=>a.id!=='kfar-saba'))assert.equal(deliveryFeeFor('delivery',area.id),3000);
  assert.equal(deliveryFeeFor('pickup','other'),0);
  assert.equal(orderTotals([{unitPriceAgorot:14400,quantity:1}],deliveryFeeFor('delivery','kfar-saba')).total,16400);
  assert.equal(orderTotals([{unitPriceAgorot:14400,quantity:1}],deliveryFeeFor('delivery','other')).total,17400);
});

test('pizza includes first topping and charges exactly five shekels for each additional topping', () => {
  const choices = [1,2,3].map(optionCode => ({groupCode:'included-topping',optionCode,priceDeltaAgorot:500}));
  for (const id of ['pizza-sambusak-01','pizza-sambusak-02','pizza-sambusak-03']) {
    for (const count of [1,2,3]) {
      const priced = priceProductSelections(id, choices.slice(0,count));
      assert.equal(unitPrice(5900,priced),5900+(count-1)*500);
      assert.deepEqual(priceProductSelections(id,priced),priced);
    }
  }
  assert.deepEqual(priceProductSelections('salads-01',choices),choices);
  assert.deepEqual(choices.map(x=>x.priceDeltaAgorot),[500,500,500]);
});
test('salad includes two dressings and charges two shekels for each additional dressing', () => {
  const dressings = [1, 2, 3, 4].map(optionCode => ({ groupCode: 'group-02', optionCode, priceDeltaAgorot: 200 }));
  for (let count = 0; count <= 4; count++) {
    const priced = priceProductSelections('salads-01', dressings.slice(0, count));
    assert.equal(unitPrice(4500, priced), 4500 + Math.max(count - 2, 0) * 200);
    assert.deepEqual(priceProductSelections('salads-01', priced), priced);
  }
  const priced = priceProductSelections('salads-01', [{ groupCode: 'group-01', priceDeltaAgorot: 300 }, ...dressings.slice(0, 3)]);
  assert.equal(unitPrice(4500, priced), 5000);
});

test('the original build-your-own salad combines Wolt premium choices with the owner dressing rule', () => {
  for (const [id, base] of [['salads-01', 4500]]) {
    const selections = [
      ...['lettuce', 'tomato', 'cucumber', 'egg'].map(optionCode => ({ groupCode: 'group-01', optionCode, priceDeltaAgorot: 0 })),
      ...['avocado', 'mozzarella'].map(optionCode => ({ groupCode: 'group-03', optionCode, priceDeltaAgorot: 700 })),
      ...['tahini', 'garlic', 'vinaigrette'].map(optionCode => ({ groupCode: 'group-02', optionCode, priceDeltaAgorot: 200 })),
    ];
    const priced = priceProductSelections(id, selections);
    assert.equal(unitPrice(base, priced), base + 900);
    assert.deepEqual(priceProductSelections(id, priced), priced);
    assert.equal(selections[4].priceDeltaAgorot, 700, 'source choices stay immutable');
    const afterRemovingFirstPremium = priced.filter(choice => choice.optionCode !== 'avocado');
    assert.equal(unitPrice(base, priceProductSelections(id, afterRemovingFirstPremium)), base + 200);
  }
});

test('toast includes the highest-priced special regardless of click order and reprices after edits', () => {
  const egg = {groupCode:'group-04',optionCode:'egg',priceDeltaAgorot:300};
  const mozzarella = {groupCode:'group-04',optionCode:'mozzarella',priceDeltaAgorot:600};
  const sauces = Array.from({length:2},()=>({groupCode:'group-05',optionCode:'garlic',priceDeltaAgorot:0}));
  for (const [choices,total] of [[[egg],4200],[[mozzarella],4200],[[egg,mozzarella],4500],[[mozzarella,egg],4500]]) {
    const priced=priceProductSelections('sandwiches-toasts-06',[...choices,...sauces]);
    assert.equal(unitPrice(4200,priced),total);
    assert.deepEqual(priceProductSelections('sandwiches-toasts-06',priced),priced);
  }
  const priced=priceProductSelections('sandwiches-toasts-06',[egg,mozzarella]);
  assert.equal(unitPrice(4200,priceProductSelections('sandwiches-toasts-06',[priced[1],priced[0]])),4500);
  assert.equal(unitPrice(4200,priceProductSelections('sandwiches-toasts-06',[priced[1]])),4200);
  assert.equal(egg.priceDeltaAgorot,300);
});

test('half-kilo pastry package has an explicit 500 gram sale unit and counts each package once', () => {
  const half=saleUnit({name:'חצי ק״ג בורקס גבינה',description:'500 גרם בורקס גבינה',priceAgorot:3500});
  assert.equal(half.confirmed,true);assert.equal(half.label,'ל־500 גרם');assert.equal(half.comparison,'₪7 / 100 גר׳');
  assert.equal(lineTotal(3500,2),7000);
});

test('salad allowances handle empty selections and the largest distinct source choice set', () => {
  const id = 'salads-01';
  assert.equal(unitPrice(4500, priceProductSelections(id, [])), 4500);
  const premiums = Array.from({ length: 9 }, (_, i) => ({ groupCode: 'group-03', optionCode: `special-${i}`, priceDeltaAgorot: 700 }));
  const dressings = Array.from({ length: 8 }, (_, i) => ({ groupCode: 'group-02', optionCode: `dressing-${i}`, priceDeltaAgorot: 200 }));
  assert.equal(unitPrice(4500, priceProductSelections(id, [...premiums, ...dressings])), 4500 + 8 * 700 + 6 * 200);
  assert.equal(unitPrice(4500, priceProductSelections(id, [premiums[0], ...dressings.slice(0, 2)])), 4500);
});
test('exact decimal input uses agorot including comma and tiny amounts', () => {
  for (const [input, expected] of [['12,34',1234],['12.34',1234],['0.01',1],['999.99',99999],['1.1',110]]) assert.equal(parsePriceInput(input), expected);
});
test('reject ambiguous, fractional-cent and unsafe input', () => {
  for (const input of ['', '-1', '1.234', '1e2', '1,2.3', '0', '21474836.48']) assert.equal(parsePriceInput(input),null);
});
test('comparison price needs explicit package weight, never old price ratios',()=>{
  assert.equal(saleUnit({name:'עוגת אוריאו',description:'',priceAgorot:7500,priceUnitNote:'600 גרם'}).comparison,'₪12.5 / 100 גר׳');
  assert.equal(saleUnit({name:'עוגת אוריאו',description:'',priceAgorot:7500,priceUnitNote:'600 גרם'}).label,'ל־600 גרם');
  assert.equal(saleUnit({name:'לחם',description:'550 גרם',priceAgorot:3333,priceUnitNote:'₪5.09 / 100 גר׳'}).comparison,'₪6.06 / 100 גר׳');
  const unknown=saleUnit({name:'מים מינרליים',description:'',priceAgorot:1234,priceUnitNote:'₪2 / 100 מל׳'});
  assert.equal(unknown.confirmed,false); assert.equal(unknown.comparison,'מחיר לפריט');
});
test('cart quantity counts packages, not contained pieces or grams',()=>{
  assert.equal(saleUnit({name:'3 יחידות לחמניות',description:'',priceAgorot:1000}).label,'למארז');
  assert.equal(lineTotal(1000,2),2000);
  assert.equal(orderTotals([{unitPriceAgorot:unitPrice(1234,[{priceDeltaAgorot:155}]),quantity:3}],1500).total,5667);
});
test('fulfillment keeps valid preference, otherwise chooses available method',()=>{
  assert.equal(resolveFulfillment('delivery',{deliveryEnabled:false,pickupEnabled:true}),'pickup');
  assert.equal(resolveFulfillment('pickup',{deliveryEnabled:true,pickupEnabled:false}),'delivery');
  assert.equal(resolveFulfillment('pickup',{deliveryEnabled:true,pickupEnabled:true}),'pickup');
});
test('storage denied, corrupt JSON, wrong version, missing cart are recoverable',()=>{
  for(const raw of ['bad json','{}','{"version":4,"cart":{}}','{"version":1,"cart":{"x":{"quantity":-1}}}']) {
    globalThis.sessionStorage={getItem:()=>raw};assert.deepEqual(readCheckoutSession().cart,{});
  }
  globalThis.sessionStorage={getItem:()=>{throw new Error('denied')}};assert.deepEqual(readCheckoutSession().cart,{});
});
test('bad cached selections are rejected before rendering',()=>{
  globalThis.sessionStorage={getItem:key=>{assert.equal(key,checkoutStorageKey);return JSON.stringify({version:1,cart:{x:{id:'x',productId:'x',quantity:1,product:{name:'x'},unitPriceAgorot:10,selections:[{groupCode:'x',optionCode:'x',groupName:'constructor'}]}}})}};
  assert.deepEqual(readCheckoutSession().cart,{});
});

test('Israeli phone normalization accepts common local and international forms only',()=>{
  for (const input of ['050-1234567', '+972 50 123 4567', '00972 (50) 123-4567', '972501234567']) assert.equal(normalizeIsraeliPhone(input),'0501234567');
  assert.equal(normalizeIsraeliPhone('09-1234567'),'091234567');
  for (const input of ['050123456', '+9720501234567', 'abc0501234567', '', '1234567890']) assert.equal(normalizeIsraeliPhone(input),'');
});

test('malformed stale cached product cannot crash rendering; well-formed removed row survives for reconciliation',()=>{
  const row={id:'removed',productId:'removed',quantity:1,product:{name:'old'},unitPriceAgorot:100,selections:[]};
  for (const optionGroups of [undefined, {}, [null], [{code:'x',name:'x',options:null}]]) {
    row.product.optionGroups=optionGroups;
    globalThis.sessionStorage={getItem:()=>JSON.stringify({version:1,cart:{removed:row}})};
    assert.deepEqual(readCheckoutSession().cart,{});
  }
  row.product.optionGroups=[];
  assert.equal(readCheckoutSession().cart.removed.product.name,'old');
});

test('tab draft survives restore, clamps untrusted values, and handles disabled storage',()=>{
  const values=new Map(); globalThis.sessionStorage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  const draft={...emptyCheckoutDraft,step:'details',phone:'+972501234567',street:'בדיקה',notes:'x'.repeat(1200)};
  writeCheckoutDraft(draft);assert.ok(values.has(checkoutDraftStorageKey));
  assert.equal(readCheckoutDraft().step,'details');assert.equal(readCheckoutDraft().street,'בדיקה');assert.equal(readCheckoutDraft().notes.length,1000);
  values.set(checkoutDraftStorageKey,JSON.stringify({step:'invalid',phone:123,residenceType:'invalid'}));
  assert.deepEqual(readCheckoutDraft(),emptyCheckoutDraft);
  globalThis.sessionStorage={getItem:()=>{throw new Error('denied')},setItem:()=>{throw new Error('denied')}};
  assert.doesNotThrow(()=>writeCheckoutDraft(draft));assert.deepEqual(readCheckoutDraft(),emptyCheckoutDraft);
});

const sampleRequest = () => ({ fulfillmentType:'delivery', requestedPickupAt:null, customerName:'לקוח בדיקה', phone:'0501234567', customerNotes:'', deliveryAddress:{city_id:'kfar-saba',city:'כפר סבא',street:'בדיקה',house_number:'12',residence_type:'private-house'}, items:[{product_id:'bourekas-02',quantity:1,option_ids:[]}],expectedTotalAgorot:8500 });
function storageMap(){const values=new Map();globalThis.sessionStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};return values;}
test('unresolved request roundtrips exactly and keeps identity across new clicks and reload',()=>{
  storageMap();const first=persistOrderIntent(sampleRequest());assert.deepEqual(readOrderIntent(),first);const second=persistOrderIntent({...sampleRequest(),customerNotes:'edited'});assert.deepEqual(second,first);
  assert.equal(first.trackingToken.length,64);assert.equal(first.idempotencyKey.length,36);
});
test('oversized request rejected before persistence; ordinary78lines roundtrip',()=>{
  const values=storageMap(),request=sampleRequest();request.items=Array.from({length:78},()=>({product_id:'drinks-01',quantity:1,option_ids:[]}));assert.deepEqual(readOrderIntent(),null);const allowed=persistOrderIntent(request);assert.deepEqual(readOrderIntent(),allowed);clearOrderIntent(allowed);
  request.items=Array.from({length:200},()=>({product_id:'salads-01',quantity:1,option_ids:Array.from({length:22},()=>crypto.randomUUID())}));assert.throws(()=>persistOrderIntent(request),/ארוכה מדי/);assert.ok(!values.has(orderIntentKey));
});
test('late older result cannot erase a newer intent or replace newer receipt',()=>{
  const values=storageMap();const first=persistOrderIntent(sampleRequest());rememberOrderReceipt({orderNumber:1001,trackingToken:first.trackingToken},first);const second=persistOrderIntent(sampleRequest());
  assert.equal(rememberOrderReceipt({orderNumber:1001,trackingToken:first.trackingToken},first),false);assert.deepEqual(readOrderIntent(),second);
  rememberOrderReceipt({orderNumber:1002,trackingToken:second.trackingToken},second);rememberOrderReceipt({orderNumber:1001,trackingToken:first.trackingToken},first);assert.equal(readOrderReceipt().orderNumber,1002);assert.ok(!values.has(orderIntentKey));assert.ok(values.has(orderReceiptKey));
});
test('corrupt existing submission never silently becomes a fresh order',()=>{
  const values=storageMap();values.set(orderIntentKey,'not-json');assert.equal(readOrderIntent(),null);assert.throws(()=>persistOrderIntent(sampleRequest()),/לא ניתן לשחזר/);
});
test('invalid new request never leaves an unreadable pending record',()=>{
  const values=storageMap();assert.throws(()=>persistOrderIntent({...sampleRequest(),customerName:'x'.repeat(101)}),/אינם תקינים/);assert.ok(!values.has(orderIntentKey));assert.ok(persistOrderIntent(sampleRequest()).idempotencyKey);
});
test('receipt storage failure preserves the request for later recovery',()=>{
  const values=storageMap(),intent=persistOrderIntent(sampleRequest());const original=sessionStorage.setItem;sessionStorage.setItem=(key,value)=>{if(key===orderReceiptKey)throw new Error('quota');original(key,value);};assert.equal(rememberOrderReceipt({orderNumber:1001,trackingToken:intent.trackingToken},intent),true);assert.deepEqual(readOrderIntent(),intent);assert.ok(values.has(orderIntentKey));
});
