import { BellRinging, Check, SpeakerHigh } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { createOrderSound } from '../domain/orderSound';
import { useOrderAttention } from '../hooks/useOrderAttention';
import { PushNotifications } from '../../../src/push/PushNotifications';
import { ownerPushApi } from '../services/pushApi';

export function OwnerOrderAlerts({ onOpenOrders }: { onOpenOrders: () => void }) {
  const { queue, error, loading, savingIds, acknowledge, refresh } = useOrderAttention();
  const [shift, setShift] = useState(false), [audioReady, setAudioReady] = useState(false), [screenStatus, setScreenStatus] = useState(''), [message, setMessage] = useState('');
  const active = useRef(false), sound = useRef(createOrderSound()), wake = useRef<WakeLockSentinel | null>(null), queueRef = useRef(queue);
  const previousIds = useRef('');
  useEffect(() => { queueRef.current = queue; const ids = queue.map(row => row.id).join(','); if (ids !== previousIds.current && queue.length && active.current && !document.hidden) sound.current.play(); previousIds.current = ids; }, [queue]);
  const keepScreenOn = async () => {
    if (!active.current || document.hidden || wake.current) return;
    if (!navigator.wakeLock) { setScreenStatus('שמירת מסך אינה נתמכת; בדקו את הגדרות הנעילה במכשיר.'); return; }
    try { const lock = await navigator.wakeLock.request('screen'); if (!active.current) { await lock.release(); return; } wake.current = lock; setScreenStatus('שמירת המסך פעילה כל עוד המכשיר מאפשר.'); lock.addEventListener('release', () => { wake.current = null; setScreenStatus('שמירת המסך שוחררה; ודאו שהעמוד פתוח.'); }); }
    catch { setScreenStatus('לא ניתן לשמור מסך דולק. בדקו את הגדרות המכשיר.'); }
  };
  useEffect(() => {
    const audio = sound.current;
    const timer = window.setInterval(() => { setAudioReady(audio.running()); if (active.current && queueRef.current.length && !document.hidden) audio.play(); }, 6000);
    const foreground = () => { if (!document.hidden && active.current) { void keepScreenOn(); setAudioReady(audio.running()); if (queueRef.current.length) audio.play(); } };
    document.addEventListener('visibilitychange', foreground);
    return () => { active.current = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', foreground); void wake.current?.release(); void audio.close(); };
  }, []);
  const start = async () => {
    try { const ready = await sound.current.enable(); active.current = ready; setShift(ready); setAudioReady(ready); sound.current.play(); void keepScreenOn(); void refresh(true); setMessage('ודאו ששמעתם את בדיקת הצליל. השאירו את המסך פתוח ומחובר לחשמל.'); }
    catch { setMessage('הצליל לא הופעל. לחצו שוב ובדקו את עוצמת השמע במכשיר.'); }
  };
  const end = async () => { active.current = false; setShift(false); setAudioReady(false); await sound.current.pause(); await wake.current?.release(); setMessage('ההתראות הקוליות כבויות. הזמנות שלא נצפו נשארות בתור.'); };
  return <section className={'owner-order-alerts' + (queue.length ? ' has-attention' : '')} aria-label="התראות הזמנות">
    <header><div><BellRinging size={25} /><strong data-testid="owner-attention-count">{loading ? 'בודקים הזמנות חדשות…' : error && !queue.length ? 'מצב ההזמנות אינו מאומת' : queue.length === 1 ? 'הזמנה חדשה אחת שטרם נצפתה' : queue.length ? `${queue.length} הזמנות חדשות שלא נצפו` : 'אין הזמנות חדשות שלא נצפו'}</strong></div><button type="button" onClick={onOpenOrders}>לכל ההזמנות</button></header>
    <div className="owner-alert-controls"><button type="button" onClick={() => void start()}><SpeakerHigh size={18} />{shift ? 'בדיקת צליל' : 'תחילת משמרת והפעלת צליל'}</button>{shift && <button type="button" onClick={() => void end()}>סיום משמרת</button>}<span data-testid="owner-audio-state">{shift && audioReady ? 'צליל פעיל' : 'הצליל אינו פעיל — נדרשת לחיצה'}</span></div>
    {error && <p className="orders-error" role="alert">{error} <button type="button" onClick={() => void refresh(true)}>ניסיון חוזר</button></p>}
    <p className="owner-alert-note" role="status">{message || 'הצליל חוזר עד ״ראיתי״. ״ראיתי״ אינו אישור הזמנה ולא מבצע חיוב.'}</p>
    {shift && <small>{screenStatus} במסך נעול או ברקע אין הבטחת צליל.</small>}
    {queue.length > 0 && <ul className="owner-attention-list">{queue.slice(0,3).map(row => <li key={row.id}><span><strong>#{row.orderNumber}</strong> {row.customerName}</span><button type="button" disabled={savingIds.has(row.id)} onClick={() => void acknowledge(row.id)}><Check size={17} />{savingIds.has(row.id) ? 'שומרים…' : 'ראיתי'}</button></li>)}</ul>}
    {queue.length > 3 && <button type="button" onClick={onOpenOrders}>לעוד {queue.length - 3} הזמנות חדשות</button>}
    <details className="owner-push-options"><summary>התראות גם כשהמסך נעול</summary><PushNotifications audience="owner" api={ownerPushApi} /></details>
  </section>;
}
