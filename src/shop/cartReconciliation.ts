import type { PublicShopSnapshot, ShopCartItem } from './publicShopTypes';

export type ReconciliationResult = {
  cart: Record<string, ShopCartItem>;
  priceChanged: boolean;
  hasInvalidItems: boolean;
};

export function reconcileCart(cart: Record<string, ShopCartItem>, snapshot: PublicShopSnapshot): ReconciliationResult {
  const productById = new Map(snapshot.products.map((product) => [product.id, product]));
  let priceChanged = false;
  let hasInvalidItems = false;
  const next: Record<string, ShopCartItem> = {};

  Object.values(cart).forEach((item) => {
    const product = productById.get(item.productId);
    if (!product) {
      next[item.id] = { ...item, invalidReason: 'המוצר אינו זמין כרגע בקטלוג החי.' };
      hasInvalidItems = true;
      return;
    }

    let invalidReason = !product.active || !product.availableToday ? 'המוצר אזל להיום.' : undefined;
    const groupsByCode = new Map(product.optionGroups.map((group) => [group.code, group]));
    const selections = item.selections.map((selection) => {
      const group = groupsByCode.get(selection.groupCode);
      const option = group?.options.find((candidate) => candidate.code === selection.optionCode && candidate.active);
      if (!group || !option) {
        invalidReason = 'אחת הבחירות במוצר אינה זמינה יותר.';
        return selection;
      }
      return {
        groupId: group.id,
        groupCode: group.code,
        groupName: group.name,
        optionId: option.id,
        optionCode: option.code,
        optionName: option.name,
        priceDeltaAgorot: option.priceDeltaAgorot,
      };
    });

    for (const group of product.optionGroups) {
      const selectedCount = selections.filter((selection) => selection.groupCode === group.code).length;
      if (selectedCount < group.minSelect || (group.maxSelect !== null && selectedCount > group.maxSelect)) {
        invalidReason = `יש לעדכן את הבחירות ב${group.name}.`;
      }
    }

    const unitPriceAgorot = product.priceAgorot + selections.reduce((sum, selection) => sum + selection.priceDeltaAgorot, 0);
    priceChanged ||= unitPriceAgorot !== item.unitPriceAgorot;
    hasInvalidItems ||= Boolean(invalidReason);
    next[item.id] = { ...item, product, selections, unitPriceAgorot, invalidReason };
  });

  return { cart: next, priceChanged, hasInvalidItems };
}
