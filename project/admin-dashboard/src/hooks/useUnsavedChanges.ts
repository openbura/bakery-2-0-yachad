import { useCallback, useEffect } from 'react';
export const navigationEvent = 'bakery:before-navigate';
export function confirmNavigation() {
  return window.dispatchEvent(new Event(navigationEvent, { cancelable: true }));
}
export function useUnsavedChanges(dirty: boolean) {
  const confirmLeave = useCallback(() => !dirty || window.confirm('יש שינויים שלא נשמרו. לצאת ולוותר עליהם?'), [dirty]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: Event) => { if (!confirmLeave()) event.preventDefault(); };
    window.addEventListener('beforeunload', unload); window.addEventListener(navigationEvent, navigate);
    return () => { window.removeEventListener('beforeunload', unload); window.removeEventListener(navigationEvent, navigate); };
  }, [dirty, confirmLeave]);
  return confirmLeave;
}
