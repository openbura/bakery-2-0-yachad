export const familyPizzaId = 'wolt-5fa974bd69c1de71557e4082';

// These conditional groups mirror the saved Wolt menu for the family L pizza.
export function familyPizzaGroupActive(productId: string, groupCode: string, mode: string | undefined) {
  if (productId !== familyPizzaId || groupCode === 'pizza-mode') return true;
  if (groupCode === 'pizza-whole') return mode === 'whole';
  if (groupCode === 'pizza-right' || groupCode === 'pizza-left') return mode === 'halves';
  return false;
}
