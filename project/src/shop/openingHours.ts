// Existing published bakery hours, evaluated in Israel regardless of device timezone.
export function isBakeryOpen(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  const day = value('weekday');
  const minutes = Number(value('hour')) * 60 + Number(value('minute'));
  return day !== 'Sat' && minutes >= 300 && minutes < (day === 'Fri' ? 960 : 1260);
}

export const outsideOpeningHoursMessage = 'המאפייה סגורה כרגע להזמנות. שעות הפעילות: א׳–ה׳ 05:00–21:00, ו׳ 05:00–16:00.';
