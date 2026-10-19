import type { ShopProduct } from './publicShopTypes';

export function needsBusinessChoices(product: Pick<ShopProduct, 'name' | 'optionGroups'>): boolean {
  return (['פיצה אישית', 'פיצה פסטו אישית'].includes(product.name) || /בהרכבה|\+\s*תוספת/.test(product.name)) && !product.optionGroups.length;
}

export function polishCatalogText(value: string): string {
  return value.replaceAll('שוקולוד', 'שוקולד').replaceAll('אלחפורס', 'אלפחורס');
}
