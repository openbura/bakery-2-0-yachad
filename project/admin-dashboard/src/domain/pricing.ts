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
  const explicitUnitNote = /^(?:\d+(?:\.\d+)?)\s*(?:גרם|מ[״"]ל)$/.test(product.priceUnitNote ?? '') ? product.priceUnitNote : '';
  const text = product.name + ' ' + product.description + ' ' + explicitUnitNote;
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
export function isBuildYourOwnSalad(productId: string) {
  return productId === 'salads-01';
}

export function isBuildYourOwnToast(productId: string) {
  return productId === 'sandwiches-toasts-06';
}

export function priceProductSelections<T extends { groupCode: string; priceDeltaAgorot: number }>(productId: string, selections: readonly T[]): T[] {
  if (isBuildYourOwnToast(productId)) {
    const sourcePrice = (selection: T) => 'sourcePriceDeltaAgorot' in selection && typeof selection.sourcePriceDeltaAgorot === 'number' ? selection.sourcePriceDeltaAgorot : selection.priceDeltaAgorot;
    // Wolt includes the highest-priced special, independent of click order.
    let includedIndex = -1;
    selections.forEach((selection, index) => {
      if (selection.groupCode === 'group-04' && (includedIndex === -1 || sourcePrice(selection) > sourcePrice(selections[includedIndex]))) includedIndex = index;
    });
    return selections.map((selection, index) => {
      if (selection.groupCode !== 'group-04') return selection;
      const sourcePriceDeltaAgorot = sourcePrice(selection);
      const priceDeltaAgorot = index === includedIndex ? 0 : sourcePriceDeltaAgorot;
      return { ...selection, sourcePriceDeltaAgorot, priceDeltaAgorot };
    });
  }
  if (isBuildYourOwnSalad(productId)) {
    let includedDressings = 0;
    let includedSpecials = 0;
    return selections.map((selection) => {
      if (selection.groupCode === 'group-02') {
        const priceDeltaAgorot = includedDressings < 2 ? 0 : 200;
        includedDressings += 1;
        return { ...selection, priceDeltaAgorot };
      }
      if (selection.groupCode === 'group-03') {
        const priceDeltaAgorot = includedSpecials < 1 ? 0 : 700;
        includedSpecials += 1;
        return { ...selection, priceDeltaAgorot };
      }
      return selection;
    });
  }
  if (!['pizza-sambusak-01', 'pizza-sambusak-02', 'pizza-sambusak-03'].includes(productId)) return [...selections];
  let included = false;
  return selections.map((selection) => {
    if (selection.groupCode !== 'included-topping' && selection.groupCode !== 'group-01') return selection;
    const priceDeltaAgorot = included ? 500 : 0;
    included = true;
    return { ...selection, priceDeltaAgorot };
  });
}
