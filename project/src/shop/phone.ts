export function normalizeIsraeliPhone(value: string): string {
  if (/[^\d\s()+.-]/u.test(value)) return '';
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00972')) digits = `0${digits.slice(5)}`;
  else if (digits.startsWith('972')) digits = `0${digits.slice(3)}`;
  return /^0(?:5\d{8}|7\d{8}|[23489]\d{7})$/.test(digits) ? digits : '';
}
