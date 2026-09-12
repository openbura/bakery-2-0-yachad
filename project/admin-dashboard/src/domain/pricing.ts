// Shared by both apps. Stored/charged amounts are integer agorot; quantity counts sale items.
const formatter = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0, maximumFractionDigits: 2 });
export function formatPrice(agorot: number) { return formatter.format(agorot / 100); }
export function parsePriceInput(value: string): number | null {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.replace(',', '.').split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 2147483647 ? amount : null;
}
export function unitPrice(base: number, selections: readonly { priceDeltaAgorot: number }[] = []) {
  return base + selections.reduce((sum, selection) => sum + selection.priceDeltaAgorot, 0);
}
export function lineTotal(unit: number, quantity: number) { return unit * quantity; }
export function orderTotals(items: readonly { unitPriceAgorot: number; quantity: number }[], fee: number) {
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item.unitPriceAgorot, item.quantity), 0);
  return { subtotal, fee, total: subtotal + fee };
}
type SaleProduct = { name: string; description: string; priceAgorot: number; priceUnitNote?: string | null };
export function saleUnit(product: SaleProduct) {
  const text = product.name + ' ' + product.description;
  // Only explicit package metadata. Never infer size from an old monetary comparison.
  const grams = text.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*גרם(?:\s|$)/);
  const kilograms = text.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*ק[״"׳']?ג(?:\s|$)/);
  const pieces = product.name.match(/(\d+)\s+יחידות/);
  if (grams) {
    const weight = Number(grams[1]);
    return { label: 'ל־' + grams[1] + ' גרם', comparison: '₪' + (Math.round(product.priceAgorot * 100 / weight) / 100) + ' / 100 גר׳', confirmed: true };
  }
  if (kilograms) return { label: 'ל־' + kilograms[1] + ' ק״ג', comparison: '', confirmed: true };
  if (pieces) return { label: 'למארז', comparison: '', confirmed: true };
  return { label: 'לפריט', comparison: product.priceUnitNote ? 'מחיר לפריט' : '', confirmed: false };
}

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
