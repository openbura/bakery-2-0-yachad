import { ArrowRight, CheckCircle, Clock, Copy, Phone, SpeakerHigh, Storefront, Truck, WarningCircle } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatPrice } from '../admin-dashboard/src/domain/pricing';
import { createOrderSound } from '../admin-dashboard/src/domain/orderSound';
import { fetchTrackedOrder } from './services/ordersRepository';
import { bakeryInfo } from './businessInfo';
import type { OrderStatus, TrackedOrder } from './shop/orderTypes';
import { PushNotifications } from './push/PushNotifications';
import { publicPushApi } from './push/publicPushApi';

const statusCopy: Record<OrderStatus, { title: string; description: string }> = {
  pending_approval: { title: 'ממתינים לאישור המאפייה', description: 'הבקשה נשמרה ונשלחה למאפייה. נעדכן כאן כשהצוות יאשר אותה. ההזמנה עדיין אינה מאושרת.' },
  approved: { title: 'ההזמנה אושרה', description: 'המאפייה אישרה את ההזמנה שלכם. אפשר לעקוב כאן אחר המשך הטיפול.' },
  preparing: { title: 'ההזמנה בהכנה', description: 'הצוות מכין את ההזמנה שלכם.' },
  ready_for_pickup: { title: 'ההזמנה מוכנה לאיסוף', description: 'אפשר להגיע לסניף ולאסוף את ההזמנה.' },
  out_for_delivery: { title: 'ההזמנה יצאה למשלוח', description: 'ההזמנה בדרך אליכם.' },
  completed: { title: 'ההזמנה הושלמה', description: 'תודה שהזמנתם ממאפיית יחד.' },
  rejected: { title: 'ההזמנה לא אושרה', description: 'המאפייה לא יכלה לאשר את ההזמנה. הסיבה מופיעה כאן למטה.' },
  cancelled: { title: 'ההזמנה בוטלה', description: 'ההזמנה אינה פעילה עוד. אפשר לפנות למאפייה לבירור.' },
};
const formatDateTime = (value: string) => new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' }).format(new Date(value));

export default function OrderTrackingPage({ token }: { token: string }) {
  const [order, setOrder] = useState<TrackedOrder | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false), [soundMessage, setSoundMessage] = useState(''), [copyMessage, setCopyMessage] = useState('');
  const orderRef = useRef<TrackedOrder | null>(null), generation = useRef(0), pending = useRef(false), mounted = useRef(false);
  const sound = useRef(createOrderSound()), soundEnabledRef = useRef(false);
  const cancelLoad = useCallback(() => { generation.current++; pending.current = false; }, []);
  const load = useCallback(async () => {
    if (pending.current) return;
    pending.current = true; const attempt = ++generation.current;
    try {
      const next = await fetchTrackedOrder(token);
      if (!mounted.current || attempt !== generation.current) return;
      if (!next) { setError('לא נמצאה הזמנה בקישור הזה. בדקו שהעתקתם את הקישור המלא.'); return; }
      const previous = orderRef.current;
      if (previous && previous.status !== next.status && soundEnabledRef.current) {
        sound.current.play();
        setSoundMessage('מצב ההזמנה עודכן: ' + statusCopy[next.status].title);
      }
      orderRef.current = next; setOrder(next); setError('');
    } catch { if (mounted.current && attempt === generation.current) setError('החיבור למאפייה נקטע. המצב שמופיע כאן הוא העדכון האחרון; ננסה שוב אוטומטית.'); }
    finally { if (attempt === generation.current) { pending.current = false; if (mounted.current) setLoading(false); } }
  }, [token]);
  useEffect(() => {
    mounted.current = true;
    document.title = 'מצב ההזמנה | מאפיית יחד';
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.append(robots); }
    robots.content = 'noindex,nofollow,noarchive';
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 4000), initial = window.setTimeout(() => void load(), 0);
    const foreground = () => { if (!document.hidden) void load(); };
    window.addEventListener('focus', foreground); window.addEventListener('online', foreground); document.addEventListener('visibilitychange', foreground);
    const audio = sound.current;
    return () => { mounted.current = false; cancelLoad(); window.clearTimeout(initial); window.clearInterval(timer); window.removeEventListener('focus', foreground); window.removeEventListener('online', foreground); document.removeEventListener('visibilitychange', foreground); void audio.close(); };
  }, [load, cancelLoad]);
  const enableSound = async () => {
    try { const enabled = await sound.current.enable(); soundEnabledRef.current = enabled; setSoundEnabled(enabled); sound.current.play(); setSoundMessage(enabled ? 'הצליל פעיל כשהעמוד הזה פתוח. כדאי להשאיר אותו פתוח עד לאישור.' : 'לא ניתן להפעיל צליל כרגע. מצב ההזמנה ממשיך להתעדכן כאן.'); }
    catch { setSoundMessage('הצליל אינו זמין במכשיר הזה. מצב ההזמנה ממשיך להתעדכן כאן.'); }
  };
  const copyLink = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopyMessage('קישור המעקב הועתק. זהו קישור פרטי להזמנה שלכם.'); } catch { setCopyMessage('אפשר להעתיק את הקישור משורת הכתובת ולשמור אותו.'); } };
  if (loading) return <main className="order-tracking-page" dir="rtl"><div className="order-tracking-card"><Clock size={40} /><h1>טוענים את ההזמנה…</h1></div></main>;
  if (!order) return <main className="order-tracking-page" dir="rtl"><div className="order-tracking-card is-error"><WarningCircle size={40} /><h1>לא הצלחנו להציג את ההזמנה</h1><p role="alert">{error}</p><button onClick={() => void load()}>ניסיון חוזר</button><a href="/shop"><ArrowRight /> לחנות</a></div></main>;
  const copy = statusCopy[order.status], rejected = ['rejected', 'cancelled'].includes(order.status), Icon = rejected ? WarningCircle : order.status === 'pending_approval' ? Clock : CheckCircle;
  return <main className="order-tracking-page" dir="rtl"><article className={'order-tracking-card' + (rejected ? ' is-error' : order.status === 'pending_approval' ? ' is-pending' : ' is-approved')}>
    <a className="order-brand" href="/">{bakeryInfo.name}</a>
    <div className="order-tracking-status" role="status" aria-live="polite" aria-atomic="true"><Icon size={46} weight="duotone" /><p className="order-tracking-eyebrow">הזמנה <bdi dir="ltr">#{order.orderNumber}</bdi></p><h1>{order.status === 'completed' ? order.fulfillmentType === 'pickup' ? 'ההזמנה נאספה' : 'ההזמנה נמסרה' : copy.title}</h1><p>{copy.description}</p></div>
    {error && <p className="order-connection-warning" role="alert">{error} <button onClick={() => void load()}>ניסיון חוזר</button></p>}
    {order.rejectionReason && <div className="order-tracking-reason"><strong>הודעה מהמאפייה:</strong> {order.rejectionReason}</div>}
    <dl className="order-tracking-summary"><div><dt>{order.fulfillmentType === 'delivery' ? <Truck size={20} /> : <Storefront size={20} />} אופן קבלה</dt><dd>{order.fulfillmentType === 'delivery' ? 'משלוח' : 'איסוף עצמי'}</dd></div>
      {order.requestedPickupAt && <div><dt>מועד האיסוף שביקשתם</dt><dd><bdi dir="ltr">{formatDateTime(order.requestedPickupAt)}</bdi></dd></div>}
      <div><dt>סכום ההזמנה</dt><dd><bdi dir="ltr">{formatPrice(order.totalAgorot)}</bdi></dd></div></dl>
    <p className="order-payment-note">אין תשלום מקוון ולא בוצע חיוב באתר.</p>
    {order.fulfillmentType === 'pickup' && <p>איסוף מ{bakeryInfo.pickupAddress}. הגיעו אחרי אישור המאפייה ובהתאם למצב ההזמנה.</p>}
    <details className="order-receipt" open><summary>מה בהזמנה</summary><ul>{order.items.map((item, index) => <li key={index}><span>{item.quantity} × {item.productName}<small>{item.options.map(option => option.optionName).join(', ')}</small></span><bdi dir="ltr">{formatPrice(item.lineTotalAgorot)}</bdi></li>)}</ul></details>
    <div className="order-tracking-actions"><button onClick={() => void load()}>רענון מצב ההזמנה</button><button onClick={() => void enableSound()}><SpeakerHigh size={19} />{soundEnabled ? 'בדיקת צליל' : 'צליל כשיש עדכון'}</button><button onClick={() => void copyLink()}><Copy size={18} />שמירת קישור המעקב</button></div>
    <p role="status">{soundMessage || 'מצב ההזמנה מתעדכן אוטומטית כשהעמוד פתוח.'}</p>{copyMessage && <p role="status">{copyMessage}</p>}
    <p className="order-phone-help">הצליל בתוך העמוד פועל כל עוד הוא פתוח. לעדכון בטלפון גם כשהעמוד סגור, אפשר להפעיל Push באזור שמתחת.</p>
    <PushNotifications audience="customer" orderId={order.orderId} token={token} api={publicPushApi} />
    <details className="order-history"><summary>עדכוני ההזמנה</summary><ol className="order-status-timeline">{order.history.map((entry,index)=><li key={index}><strong>{statusCopy[entry.status].title}</strong><time><bdi dir="ltr">{formatDateTime(entry.createdAt)}</bdi></time></li>)}</ol></details>
    <div className="order-contact"><a href={bakeryInfo.phoneHref}><Phone size={18} />לבירור עם המאפייה</a><a href="/shop"><ArrowRight size={18} />חזרה לחנות</a></div>
  </article></main>;
}
