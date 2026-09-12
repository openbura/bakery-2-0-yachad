const focusable = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
export function activateModal(element: HTMLElement, close: () => void) {
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const changed: Array<[HTMLElement, boolean]> = [];
  element.inert = false;
  for (let child: HTMLElement = element; child.parentElement; child = child.parentElement) {
    for (const sibling of child.parentElement.children) {
      if (sibling !== child && sibling instanceof HTMLElement && !sibling.matches('[data-modal-backdrop]')) {
        changed.push([sibling, sibling.inert]); sibling.inert = true;
      }
    }
  }
  const oldBody = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const targets = () => Array.from(element.querySelectorAll<HTMLElement>(focusable)).filter(e => !e.closest('[inert]') && e.getClientRects().length);
  const focusFirst = () => (targets()[0] ?? element).focus({ preventScroll: true });
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key !== 'Tab') return;
    const all = targets(), first = all[0], last = all.at(-1);
    if (!first) { event.preventDefault(); element.focus(); }
    else if (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !element.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  };
  const focusin = (event: FocusEvent) => { if (!element.contains(event.target as Node)) focusFirst(); };
  document.addEventListener('keydown', keydown, true); document.addEventListener('focusin', focusin);
  focusFirst();
  return () => {
    document.removeEventListener('keydown', keydown, true); document.removeEventListener('focusin', focusin);
    for (const [el, inert] of changed) el.inert = inert;
    document.body.style.overflow = oldBody;
    if (previousFocus?.isConnected && !previousFocus.closest('[inert]')) previousFocus.focus({ preventScroll: true });
  };
}
