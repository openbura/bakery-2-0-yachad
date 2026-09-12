const fs=require('node:fs'),path=require('node:path');const r=__dirname,p=path.join(r,'project'),backup=path.join(r,'cart-edit-checkpoint');
const files=['src/ShopPage.tsx','src/shop/cartReconciliation.ts','admin-dashboard/src/domain/pricing.ts','product-catalog-yachad.json','src/data/public-catalog-fallback.json','admin-dashboard/src/data/catalogSeed.json'];
for(const f of [...files,'../public-fixtures.json']){const dest=path.join(backup,f.replace('../',''));fs.mkdirSync(path.dirname(dest),{recursive:true});if(!fs.existsSync(dest))fs.copyFileSync(path.join(p,f),dest);}
let pricing=fs.readFileSync(path.join(p,files[2]),'utf8');pricing+=`
// Approved demo rule: up to three pizza toppings, first included, each additional 500 agorot.
export function priceProductSelections<T extends { groupCode: string; priceDeltaAgorot: number }>(productId: string, selections: readonly T[]): T[] {
  if (!['pizza-sambusak-01', 'pizza-sambusak-02', 'pizza-sambusak-03'].includes(productId)) return [...selections];
  let included = false;
  return selections.map((selection) => {
    if (selection.groupCode !== 'included-topping' && selection.groupCode !== 'group-01') return selection;
    const priceDeltaAgorot = included ? 500 : 0;
    included = true;
    return { ...selection, priceDeltaAgorot };
  });
}
`;fs.writeFileSync(path.join(p,files[2]),pricing);
let rec=fs.readFileSync(path.join(p,files[1]),'utf8').replace('import { unitPrice }','import { unitPrice, priceProductSelections }').replace('const selections = item.selections.map((selection) => {','const selections = priceProductSelections(product.id, item.selections.map((selection) => {').replace('    });\n\n    for (const group', '    }));\n\n    for (const group').replace('    });\r\n\r\n    for (const group', '    }));\r\n\r\n    for (const group');fs.writeFileSync(path.join(p,files[1]),rec);
let s=fs.readFileSync(path.join(p,files[0]),'utf8');s=s.replace('formatPrice, saleUnit, unitPrice,','formatPrice, saleUnit, unitPrice, priceProductSelections,');s=s.replace('group.maxSelect === 1);','group.maxSelect === 3);');s=s.replace("  const [customizingProduct,", "  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);\n  const [customizingProduct,");s=s.replace('setCustomizingProduct(null); setSelectedOptions({}); setCustomizationError(\'\');',"setCustomizingProduct(null); setSelectedOptions({}); setCustomizationError('');\n      if (editingCartItemId) setCartOpen(true);\n      setEditingCartItemId(null);");s=s.replace('}, [customizingProduct]);','}, [customizingProduct, editingCartItemId]);');
s=s.replace('getActiveOptionGroups(product).flatMap((group) => {','priceProductSelections(product.id, getActiveOptionGroups(product).flatMap((group) => {');s=s.replace('    })\r\n  );\r\n\r\n  const openProductOptions','    }))\r\n  );\r\n\r\n  const openProductOptions').replace('    })\n  );\n\n  const openProductOptions','    }))\n  );\n\n  const openProductOptions');
s=s.replace('const openProductOptions = (product: ShopProduct) => {\r\n    setSelectedOptions({});',`const openProductOptions = (product: ShopProduct, item?: ShopCartItem) => {
    setEditingCartItemId(item?.id ?? null);
    setSelectedOptions(item ? Object.fromEntries(product.optionGroups.map(group => [group.code, item.selections.filter(selection => selection.groupCode === group.code).map(selection => selection.optionCode)])) : {});
    if (item) setCartOpen(false);`);
s=s.replace('  const closeProductOptions = () => {',`  const closeProductOptions = () => {
    if (editingCartItemId) setCartOpen(true);
    setEditingCartItemId(null);`);
const start=s.indexOf('    setCart((current) => ({',s.indexOf('const addConfiguredProductToCart')),end=s.indexOf('    closeProductOptions();',start);
s=s.slice(0,start)+`    const editingItem = editingCartItemId ? cart[editingCartItemId] : undefined;
    if (editingCartItemId && !editingItem) { setCustomizationError('הפריט כבר אינו בסל. סגרו את החלון ונסו שוב.'); return; }
    const mergedQuantity = (editingItem?.quantity ?? 1) + (itemId === editingCartItemId ? 0 : cart[itemId]?.quantity ?? 0);
    if (mergedQuantity > 999) { setCustomizationError('לא ניתן לשמור יותר מ־999 יחידות מאותו פריט.'); return; }
    setCart((current) => {
      const next = { ...current };
      if (editingCartItemId) delete next[editingCartItemId];
      next[itemId] = { id: itemId, productId: currentProduct.id, product: currentProduct, quantity: mergedQuantity, selections, unitPriceAgorot };
      return next;
    });
`+s.slice(end);
s=s.replace('window.requestAnimationFrame(() => setAddToastVisible(true));\r\n  };\r\n\r\n  const addToCart','if (!editingCartItemId) window.requestAnimationFrame(() => setAddToastVisible(true));\r\n  };\r\n\r\n  const addToCart');
s=s.replace('<div className="shop-cart-item-actions">','<div className="shop-cart-item-actions">\n                        {hasProductOptions(product) && <button className="shop-remove-item" type="button" onClick={() => openProductOptions(product, item)} aria-label={`עריכת ${product.name}`}>עריכה</button>}');
s=s.replaceAll('תוספת אחת כלולה במחיר. תוספות בתשלום יש לתאם עם המאפייה.','עד 3 תוספות: הראשונה כלולה במחיר, כל תוספת נוספת ב־5 ₪.');s=s.replace('                            {option.priceDeltaAgorot > 0 && <bdi>','                            {!hasIncludedPizzaChoice(displayedCustomizingProduct) && option.priceDeltaAgorot > 0 && <bdi>');s=s.replace('                הוספה להזמנה\r\n',"                {editingCartItemId ? 'שמירת שינויים' : 'הוספה להזמנה'}\r\n");fs.writeFileSync(path.join(p,files[0]),s);
for(const f of files.slice(3)){const data=JSON.parse(fs.readFileSync(path.join(p,f)));for(const x of data.products)if(['pizza-sambusak-01','pizza-sambusak-02','pizza-sambusak-03'].includes(x.id)){x.option_groups[0].max=3;x.option_groups[0].options.forEach(o=>o.price_delta=5);}fs.writeFileSync(path.join(p,f),JSON.stringify(data,null,2));}
const db=JSON.parse(fs.readFileSync(path.join(r,'public-fixtures.json')));for(const g of db.product_option_groups)if(g.code==='included-topping'){g.max_select=3;db.product_options.filter(o=>o.group_id===g.id).forEach(o=>o.price_delta_agorot=500);}fs.writeFileSync(path.join(r,'public-fixtures.json'),JSON.stringify(db,null,2));console.log('Updated scoped pizza rule and cart editing; checkpoint preserved');

