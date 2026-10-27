export const cateringTrayId = 'catering-mini-sandwiches-12';
export const trayFillings = [
  { code: 'tuna-salad', name: 'סלט טונה' },
  { code: 'egg-salad', name: 'סלט ביצים' },
  { code: 'pesto-bulgarian', name: 'פסטו בולגרית' },
  { code: 'sabich', name: 'סביח' },
  { code: 'omelette', name: 'חביתה' },
] as const;

type TrayChoice = { groupCode: string; optionCode: string };

export function traySelectionError(selections: readonly TrayChoice[]): string | undefined {
  const mode = selections.filter(choice => choice.groupCode === 'tray-mode');
  const mixed = selections.filter(choice => choice.groupCode === 'tray-mix');
  const single = selections.filter(choice => choice.groupCode === 'tray-single');
  if (mode.length !== 1 || !['mixed', 'single'].includes(mode[0].optionCode)) return 'בחרו מגש מיקס או מגש מסוג אחד.';
  const knownFillings = new Set<string>(trayFillings.map(choice => choice.code));
  if (selections.some(choice => !['tray-mode', 'tray-mix', 'tray-single'].includes(choice.groupCode)) || [...mixed, ...single].some(choice => !knownFillings.has(choice.optionCode))) return 'אחת הבחירות במגש אינה זמינה. בחרו שוב את החלוקה.';
  if (mode[0].optionCode === 'mixed') {
    if (single.length) return 'במגש מיקס יש לבחור את חלוקת הכריכונים בלבד.';
    if (mixed.length !== 12) return 'יש לחלק בדיוק 12 כריכונים בין המילויים.';
  } else if (mixed.length || single.length !== 1) {
    return 'בחרו מילוי אחד. כל 12 הכריכונים יהיו מהמילוי שנבחר בלבד.';
  }
  return undefined;
}
