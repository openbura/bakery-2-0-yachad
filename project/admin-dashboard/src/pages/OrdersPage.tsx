import { CalendarBlank, Check, Clock, Package, Phone, Storefront, Truck, WhatsappLogo, X } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatPrice } from '../domain/pricing';
import { fetchAdminPickupSlots, fetchOrders, transitionOrder, updatePickupSlot } from '../services/ordersRepository';
import { ownerMessage } from '../services/serviceErrors';
import { useOrderAttention } from '../hooks/useOrderAttention';
import type { AdminOrder, AdminPickupSlot, OrderStatus } from '../types/dashboard';

const statusLabels:Record<OrderStatus,string>={pending_approval:'ממתינה לאישור',approved:'אושרה',preparing:'בהכנה',ready_for_pickup:'מוכנה לאיסוף',out_for_delivery:'יצאה למשלוח',completed:'הושלמה',rejected:'נדחתה',cancelled:'בוטלה'};
const date=(value:string)=>new Intl.DateTimeFormat('he-IL',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Jerusalem'}).format(new Date(value));
function nextActions(order:AdminOrder):Array<{status:OrderStatus;label:string;tone?:string}>{
  if(order.status==='pending_approval')return[{status:'approved',label:'אישור הזמנה'},{status:'rejected',label:'דחייה',tone:'danger'}];
  if(order.status==='approved')return[{status:'preparing',label:'התחלת הכנה'},{status:'cancelled',label:'ביטול',tone:'danger'}];
  if(order.status==='preparing')return[{status:order.fulfillmentType==='pickup'?'ready_for_pickup':'out_for_delivery',label:order.fulfillmentType==='pickup'?'מוכנה לאיסוף':'יצאה למשלוח'},{status:'cancelled',label:'ביטול',tone:'danger'}];
  if(['ready_for_pickup','out_for_delivery'].includes(order.status))return[{status:'completed',label:order.fulfillmentType==='pickup'?'סימון כנאספה':'סימון כנמסרה'},{status:'cancelled',label:'ביטול',tone:'danger'}];return[];
}
function whatsappUrl(order:AdminOrder){return 'https://wa.me/'+order.phoneE164+'?text='+encodeURIComponent(`שלום ${order.customerName}, עדכון ממאפיית יחד להזמנה #${order.orderNumber}: ${statusLabels[order.status]}.${order.rejectionReason?'\n'+order.rejectionReason:''}`);}
export function OrdersPage(){
  const [orders,setOrders]=useState<AdminOrder[]>([]),[slots,setSlots]=useState<AdminPickupSlot[]>([]),[tab,setTab]=useState<'orders'|'slots'>('orders'),[filter,setFilter]=useState<'active'|'all'>('active');
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[actionError,setActionError]=useState(''),[slotsError,setSlotsError]=useState(''),[slotsLoading,setSlotsLoading]=useState(false),[savingIds,setSavingIds]=useState<ReadonlySet<string>>(new Set());
  const saving=useRef(new Set<string>()),generation=useRef(0),request=useRef<AbortController|null>(null),mounted=useRef(false);
  const attention=useOrderAttention();
  const cancelRequest=useCallback(()=>{generation.current++;request.current?.abort();request.current=null;},[]);
  const load=useCallback(async(replace=false)=>{
    if(request.current&&!replace)return;request.current?.abort();const controller=new AbortController(),attempt=++generation.current;request.current=controller;const timeout=window.setTimeout(()=>controller.abort(),12000);
    try{const next=await fetchOrders(filter==='all',controller.signal);if(mounted.current&&attempt===generation.current){setOrders(next);setError('');}}
    catch(caught){if(mounted.current&&attempt===generation.current)setError(ownerMessage(caught,'ההזמנות לא נטענו. המידע המוצג הוא העדכון האחרון.'));}
    finally{window.clearTimeout(timeout);if(attempt===generation.current){request.current=null;if(mounted.current)setLoading(false);}}
  },[filter]);
  const attentionIds = attention.queue.map(order => order.id).join(',');
  useEffect(()=>{if(!attentionIds)return;const timer=window.setTimeout(()=>void load(true),0);return()=>window.clearTimeout(timer);},[attentionIds,load]);
  const loadSlots=useCallback(async()=>{setSlotsLoading(true);try{setSlots(await fetchAdminPickupSlots());setSlotsError('');}catch(caught){setSlotsError(ownerMessage(caught,'מועדי האיסוף לא נטענו.'));}finally{setSlotsLoading(false);}},[]);
  useEffect(()=>{mounted.current=true;const initial=window.setTimeout(()=>void load(true),0),timer=window.setInterval(()=>{if(!document.hidden)void load();},5000);const focus=()=>void load();window.addEventListener('focus',focus);window.addEventListener('online',focus);return()=>{mounted.current=false;cancelRequest();window.clearTimeout(initial);window.clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('online',focus);};},[load,cancelRequest]);
  useEffect(()=>{if(tab!=='slots')return;const timer=window.setTimeout(()=>void loadSlots(),0);return()=>window.clearTimeout(timer);},[tab,loadSlots]);
  const visibleOrders=useMemo(()=>filter==='all'?orders:orders.filter(order=>!['completed','rejected','cancelled'].includes(order.status)),[orders,filter]);
  const pendingCount=orders.filter(order=>order.status==='pending_approval').length;
  const begin=(id:string)=>{if(saving.current.has(id))return false;saving.current.add(id);setSavingIds(new Set(saving.current));return true;};
  const end=(id:string)=>{saving.current.delete(id);if(mounted.current)setSavingIds(new Set(saving.current));};
  const changeStatus=async(order:AdminOrder,status:OrderStatus)=>{
    if(saving.current.has(order.id))return;let reason='';if(['rejected','cancelled'].includes(status)){reason=window.prompt(status==='rejected'?'כתבו סיבה לדחיית ההזמנה:':'כתבו סיבה לביטול ההזמנה:')?.trim()??'';if(reason.length<3)return;}
    if(!window.confirm(`לעדכן את הזמנה #${order.orderNumber} לסטטוס ״${statusLabels[status]}״?`))return;if(!begin(order.id))return;setActionError('');
    try{await transitionOrder(order,status,reason);await Promise.all([load(true),attention.refresh(true)]);}catch(caught){await load(true);setActionError(ownerMessage(caught,'סטטוס ההזמנה לא עודכן.'));}finally{end(order.id);}
  };
  const toggleSlot=async(slot:AdminPickupSlot)=>{if(!begin(slot.startsAt))return;try{await updatePickupSlot(slot,!slot.enabled);await loadSlots();}catch(caught){setSlotsError(ownerMessage(caught,'המועד לא עודכן.'));}finally{end(slot.startsAt);}};
  return <div className="page-stack orders-page"><header className="page-header"><div><p className="eyebrow">תפעול הזמנות</p><h1>הזמנות ואיסוף</h1><p>אישור, הכנה ועדכון הלקוח. ללא תשלום מקוון.</p></div><button className="button button--secondary" onClick={()=>void load(true)}>רענון</button></header>
    <div className="orders-tabs"><button className={tab==='orders'?'is-active':''} onClick={()=>setTab('orders')}>הזמנות {pendingCount>0&&<b>{pendingCount}</b>}</button><button className={tab==='slots'?'is-active':''} onClick={()=>setTab('slots')}>מועדי איסוף</button></div>
    {(error||actionError)&&<div className="orders-error" role="alert">{actionError||error}</div>}
    {tab==='slots'?<section className="pickup-slots-panel"><div className="orders-section-head"><div><h2>מועדי האיסוף הקרובים</h2><p>חסימת מועד מונעת בקשות חדשות; הזמנות שכבר נשמרו אינן מתבטלות.</p></div><button onClick={()=>void loadSlots()}>רענון מועדים</button></div>{slotsError&&<p className="orders-error" role="alert">{slotsError}</p>}{slotsLoading?<p>טוענים מועדים…</p>:<div className="admin-slots-grid">{slots.map(slot=><article key={slot.startsAt} className={!slot.enabled?'is-blocked':''}><CalendarBlank size={20}/><strong><bdi dir="ltr">{date(slot.startsAt)}</bdi></strong><span>{slot.reserved}/{slot.capacity} הזמנות</span><button disabled={savingIds.has(slot.startsAt)} onClick={()=>void toggleSlot(slot)}>{slot.enabled?'חסימת המועד':'פתיחת המועד'}</button></article>)}</div>}</section>:
    <section><div className="orders-section-head"><div><h2>לוח הזמנות</h2><p>״ראיתי״ משתיק התראה בלבד. אישור ההזמנה מעדכן את מסך הלקוח.</p></div><div className="orders-filter"><button className={filter==='active'?'is-active':''} onClick={()=>setFilter('active')}>פעילות</button><button className={filter==='all'?'is-active':''} onClick={()=>setFilter('all')}>פעילות וארכיון אחרון</button></div></div>
      {loading?<div className="orders-empty">טוענים הזמנות…</div>:!visibleOrders.length?<div className="orders-empty"><Package size={32}/><strong>{error?'לא ניתן לאמת את רשימת ההזמנות':'אין הזמנות להצגה'}</strong></div>:<div className="orders-list">{visibleOrders.map(order=><article className="admin-order-card" key={order.id} data-order-number={order.orderNumber}>
        <header><div><span className={'order-status is-'+order.status}>{statusLabels[order.status]}</span><h3>הזמנה <bdi dir="ltr">#{order.orderNumber}</bdi></h3></div><strong><bdi dir="ltr">{formatPrice(order.totalAgorot)}</bdi></strong></header>
        <div className="admin-order-meta"><span><Clock size={18}/><bdi dir="ltr">{date(order.createdAt)}</bdi></span><span>{order.fulfillmentType==='pickup'?<Storefront size={18}/>:<Truck size={18}/>} {order.fulfillmentType==='pickup'?'איסוף עצמי':'משלוח'}</span>{order.requestedPickupAt&&<span><CalendarBlank size={18}/><bdi dir="ltr">{date(order.requestedPickupAt)}</bdi></span>}<a href={'tel:+'+order.phoneE164}><Phone size={18}/><bdi dir="ltr">+{order.phoneE164}</bdi></a></div>
        <div className="admin-order-customer"><strong>{order.customerName}</strong>{order.deliveryAddress&&<><span>{order.deliveryAddress.city}, {order.deliveryAddress.street} {order.deliveryAddress.house_number}</span>{order.deliveryAddress.residence_type==='building'&&<span>קומה {order.deliveryAddress.floor}, דירה {order.deliveryAddress.apartment}{order.deliveryAddress.entrance?', כניסה '+order.deliveryAddress.entrance:''}</span>}{order.deliveryAddress.city_id==='other'&&<p className="orders-error">יישוב נוסף — יש לאמת שירות ועלות עם הלקוח לפני אישור.</p>}</>}{order.customerNotes&&<p>{order.customerNotes}</p>}</div>
        <ul className="admin-order-items">{order.items.map(item=><li key={item.id}><span><b>{item.quantity}×</b> {item.productName}{item.options.length>0&&<small>{item.options.map(option=>option.optionName).join(', ')}</small>}</span><bdi dir="ltr">{formatPrice(item.lineTotalAgorot)}</bdi></li>)}</ul>
        {order.rejectionReason&&<p className="order-reason"><strong>סיבה:</strong> {order.rejectionReason}</p>}
        <footer><div>{attention.queue.some(row=>row.id===order.id)&&<button disabled={attention.savingIds.has(order.id)} onClick={()=>void attention.acknowledge(order.id)}><Check size={17}/>ראיתי</button>}{nextActions(order).map(action=><button key={action.status} className={action.tone==='danger'?'is-danger':'is-primary'} disabled={savingIds.has(order.id)} onClick={()=>void changeStatus(order,action.status)}>{action.tone==='danger'?<X size={17}/>:<Check size={17}/>} {action.label}</button>)}</div><a href={whatsappUrl(order)} target="_blank" rel="noreferrer"><WhatsappLogo size={18}/>עדכון ידני ללקוח</a></footer>
      </article>)}</div>}
      {filter==='all'&&<p>כל ההזמנות הפעילות ו־100 ההזמנות הסגורות האחרונות. תור ההתראות כולל את כל החדשות שלא נצפו.</p>}
    </section>}
  </div>;
}
