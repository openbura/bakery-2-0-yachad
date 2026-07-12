import { CheckCircle, Info, WarningCircle, X } from '@phosphor-icons/react';
import type { ToastMessage } from '../types/dashboard';

export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  if (!toast) return null;

  const Icon = toast.tone === 'success' ? CheckCircle : toast.tone === 'error' ? WarningCircle : Info;

  return (
    <div className={`toast toast--${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'} aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}>
      <Icon size={22} weight="fill" aria-hidden="true" />
      <span>{toast.text}</span>
      <button type="button" onClick={onDismiss} aria-label="סגירת הודעה"><X size={18} /></button>
    </div>
  );
}
