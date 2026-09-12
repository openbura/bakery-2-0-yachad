import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePriceInput, saleUnit, unitPrice, lineTotal, orderTotals, priceProductSelections } from '../admin-dashboard/src/domain/pricing.ts';
import { readCheckoutSession, resolveFulfillment, checkoutStorageKey } from '../src/shop/checkoutSession.ts';

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
test('exact decimal input uses agorot including comma and tiny amounts', () => {
  for (const [input, expected] of [['12,34',1234],['12.34',1234],['0.01',1],['999.99',99999],['1.1',110]]) assert.equal(parsePriceInput(input), expected);
});
test('reject ambiguous, fractional-cent and unsafe input', () => {
  for (const input of ['', '-1', '1.234', '1e2', '1,2.3', '0', '21474836.48']) assert.equal(parsePriceInput(input),null);
});
test('comparison price needs explicit package weight, never old price ratios',()=>{
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
