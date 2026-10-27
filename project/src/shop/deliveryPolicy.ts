export const deliveryAreas = [
  { id: 'kfar-saba', label: 'כפר סבא', requiresConfirmation: false, feeAgorot: 2000 },
  { id: 'hod-hasharon', label: 'הוד השרון', requiresConfirmation: false, feeAgorot: 3000 },
  { id: 'raanana', label: 'רעננה', requiresConfirmation: false, feeAgorot: 3000 },
  { id: 'other', label: 'יישוב בסביבה', requiresConfirmation: true, feeAgorot: 3000 },
] as const;

export function deliveryFeeFor(fulfillment: 'delivery' | 'pickup', cityId: string, pickupFeeAgorot = 0): number {
  if (fulfillment === 'pickup') return pickupFeeAgorot;
  return deliveryAreas.find(area => area.id === cityId)?.feeAgorot ?? 3000;
}

export function resolveDeliveryCity(cityId: string, otherCity: string): string {
  if (cityId !== 'other') return cityId;
  const normalize = (value: string) => value.normalize('NFKC').replace(/[\s־–—-]/g, '');
  return deliveryAreas.find(area => area.id !== 'other' && normalize(area.label) === normalize(otherCity))?.id ?? cityId;
}
