import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react';
import { BrandMark } from './BrandMark';

type WorkspaceStateProps = {
  title: string;
  message: string;
  tone?: 'loading' | 'error';
  standalone?: boolean;
  onRetry?: () => void;
};

export function WorkspaceState({ title, message, tone = 'loading', standalone = false, onRetry }: WorkspaceStateProps) {
  const content = (
    <section className={`workspace-state workspace-state--${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-busy={tone === 'loading'}>
      {tone === 'loading' ? <span className="spinner workspace-state__spinner" /> : <WarningCircle size={28} weight="fill" />}
      <h1>{title}</h1>
      <p>{message}</p>
      {onRetry && <button className="button button--primary" type="button" onClick={onRetry}><ArrowClockwise size={19} /> ניסיון נוסף</button>}
    </section>
  );

  if (!standalone) return content;
  return <main className="login-page"><div className="standalone-state"><div className="standalone-state__brand"><BrandMark /></div>{content}</div></main>;
}
