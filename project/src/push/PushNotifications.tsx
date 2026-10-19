import { useEffect, useRef, useState } from 'react';
import { getPushDeviceSecret, readPushRoutes, removePushRoute, savePushRoute } from './pushStorage';
import type { PushApi, PushAudience } from './pushApi';
import './push.css';

type Props={audience:PushAudience;api:PushApi;orderId?:string;token?:string};
const supported=()=>isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
function needsHomeScreen(){return (/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)&&!window.matchMedia('(display-mode: standalone)').matches&&!(navigator as Navigator&{standalone?:boolean}).standalone;}
function serverKey(value:string){const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,character=>character.charCodeAt(0));}
export function PushNotifications({audience,api,orderId,token}:Props){
  const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[config,setConfig]=useState<{enabled:boolean;publicKey:string;localOnly?:boolean}|null>(null),[message,setMessage]=useState(''),[blocked,setBlocked]=useState(false);
  const mounted=useRef(false),saving=useRef(false);
  const [hasSubscription,setHasSubscription]=useState(false);
  const homeScreen=needsHomeScreen(),canPush=supported();
  useEffect(()=>{
    mounted.current=true;
    let sequence=0;
    const load=async()=>{if(saving.current)return;const attempt=++sequence;try{
      const next=await api('get_bakery_push_config',{}) as {enabled:boolean;publicKey:string;localOnly?:boolean};if(!mounted.current||attempt!==sequence)return;setConfig(next);
      if(!canPush)return;setBlocked(Notification.permission==='denied');
      const registration=await navigator.serviceWorker.getRegistration('/'),subscription=await registration?.pushManager.getSubscription(),secret=getPushDeviceSecret();
      if(mounted.current)setHasSubscription(Boolean(subscription));
      if(!subscription||!secret||Notification.permission!=='granted'){if(mounted.current&&attempt===sequence)setEnabled(false);return;}
      const active=await api('get_bakery_push_binding',{p_audience:audience,p_tracking_token:token??null,p_endpoint:subscription.endpoint,p_device_secret:secret});
      if(mounted.current&&attempt===sequence)setEnabled(active===true&&next.enabled);
    }catch{if(mounted.current&&attempt===sequence)setMessage('לא הצלחנו לבדוק את הגדרת ההתראות. אפשר לרענן ולנסות שוב.');}};
    const foreground=()=>{if(!document.hidden)void load();};window.addEventListener('focus',foreground);document.addEventListener('visibilitychange',foreground);
    void load();return()=>{mounted.current=false;sequence++;window.removeEventListener('focus',foreground);document.removeEventListener('visibilitychange',foreground);};
  },[api,audience,token,canPush]);
  const enable=async()=>{
    if(saving.current||!config?.enabled||!canPush||homeScreen)return;
    saving.current=true;setBusy(true);setMessage('');
    // The permission request starts directly inside the user gesture (iOS).
    try{
      const permission=Notification.permission==='granted'?Promise.resolve('granted' as NotificationPermission):Notification.requestPermission();
      const granted=await permission;if(granted!=='granted'){setBlocked(granted==='denied');setMessage('ההרשאה לא ניתנה. אפשר להמשיך לעקוב באתר בלי התראות.');return;}
      const secret=getPushDeviceSecret(true)!;
      if(audience==='customer'){if(!orderId||!token)throw new Error('פתחו את קישור המעקב המלא.');await savePushRoute({id:'customer:'+orderId,path:'/order/'+token});}
      const registration=await navigator.serviceWorker.register('/push-sw.js?audience='+audience,{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready;
      let subscription=await registration.pushManager.getSubscription();
      if(subscription?.options.applicationServerKey&&Array.from(new Uint8Array(subscription.options.applicationServerKey)).join(',')!==Array.from(serverKey(config.publicKey)).join(','))throw new Error('הגדרות ההתראות השתנו. הפסיקו עדכונים במכשיר והפעילו מחדש.');
      subscription??=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:serverKey(config.publicKey)});
      if(mounted.current)setHasSubscription(true);
      await api('register_bakery_push',{p_audience:audience,p_tracking_token:token??null,p_endpoint:subscription.endpoint,p_keys:subscription.toJSON().keys,p_device_secret:secret,p_application_key:config.publicKey});
      if(mounted.current){setEnabled(true);setBlocked(false);setMessage('העדכונים הופעלו במכשיר הזה. הופעתם והצליל כפופים להגדרות ההתראות ומצב הריכוז.');}
    }catch(error){if(mounted.current)setMessage(error instanceof Error?error.message:'ההתראות לא הופעלו. אפשר לנסות שוב.');}
    finally{saving.current=false;if(mounted.current)setBusy(false);}
  };
  const resetDevice=async()=>{
    if(saving.current)return;saving.current=true;setBusy(true);
    try{const registration=await navigator.serviceWorker.getRegistration('/'),subscription=await registration?.pushManager.getSubscription(),secret=getPushDeviceSecret();if(subscription&&secret)await api('retire_bakery_push_device',{p_endpoint:subscription.endpoint,p_device_secret:secret});if(subscription&&!await subscription.unsubscribe())throw Error();setEnabled(false);setHasSubscription(false);setMessage('הרשמת המכשיר נוקתה. הפעילו עדכונים מחדש כאן וגם בהזמנות אחרות ששמרתם במכשיר.');}
    catch{setMessage('לא הצלחנו לנקות את הרשמת המכשיר. אפשר לחסום ולחדש התראות בהגדרות הדפדפן.');}
    finally{saving.current=false;if(mounted.current)setBusy(false);}
  };
  const clearOwnerDevices=async()=>{
    if(saving.current||!window.confirm('להפסיק Push בכל המכשירים של חשבון הבעלים הזה? יהיה צורך להפעיל מחדש בכל מכשיר.'))return;
    saving.current=true;setBusy(true);try{await api('clear_bakery_owner_push',{});setEnabled(false);setMessage('הרשמות החשבון נוקו. הפעילו שוב במכשיר הזה ובכל מכשיר נוסף שצריך לקבל התראות.');}catch{setMessage('לא ניתן לנקות את ההרשמות כרגע.');}finally{saving.current=false;if(mounted.current)setBusy(false);}
  };
  const disable=async()=>{
    if(saving.current)return;saving.current=true;setBusy(true);setMessage('');
    try{const registration=await navigator.serviceWorker.getRegistration('/'),subscription=await registration?.pushManager.getSubscription(),secret=getPushDeviceSecret();
      if(subscription&&secret)await api('remove_bakery_push',{p_audience:audience,p_tracking_token:token??null,p_endpoint:subscription.endpoint,p_device_secret:secret});
      if(audience==='customer'&&orderId)await removePushRoute('customer:'+orderId);
      if(audience==='owner'||!(await readPushRoutes()).length)await subscription?.unsubscribe();
      if(mounted.current){setEnabled(false);setMessage(audience==='owner'?'התראות ההזמנות הופסקו במכשיר. ניתן להפעיל מחדש.':'העדכונים להזמנה הזו הופסקו במכשיר.');}
    }catch{if(mounted.current)setMessage('הפסקת העדכונים לא אושרה. נסו שוב או חסמו התראות בהגדרות המכשיר.');}
    finally{saving.current=false;if(mounted.current)setBusy(false);}
  };
  const copyLink=async()=>{try{await navigator.clipboard.writeText(location.href);setMessage('הקישור הועתק. אחרי ההוספה למסך הבית, פתחו את האפליקציה והדביקו אותו במסך העדכונים.');}catch{setMessage('העתיקו את קישור המעקב משורת הכתובת ושמרו אותו לפני הוספה למסך הבית.');}};
  return <section className="bakery-push-settings" aria-label="עדכונים בטלפון" data-testid={'push-settings-'+audience} dir="rtl">
    <strong>{audience==='owner'?'התראות גם כשהמסך נעול':'עדכון בטלפון כשההזמנה מאושרת'}</strong>
    <p>{audience==='owner'?'התראת מערכת להזמנה חדשה, בנוסף לצליל החוזר כשהעמוד פתוח. פתיחת ההתראה אינה מסמנת ״ראיתי״.':'אפשר לקבל התראת מערכת אחרי אישור המאפייה, גם כשהעמוד סגור. ההרשאה אינה חובה להזמנה.'}</p>
    {config?.localOnly&&<p className="push-local-note">בדיקה מקומית: השליחה נלכדת במחשב. לא תגיע התראה לטלפון מהסביבה הזו.</p>}
    {homeScreen?<div className="push-install-help"><p>באייפון או באייפד מוסיפים קודם למסך הבית: שיתוף ← הוספה למסך הבית. אם מופיע ״פתיחה כיישום אינטרנט״, השאירו אותו פעיל.</p>{audience==='customer'?<><p>העתיקו קודם את קישור המעקב. פתחו את האפליקציה מהמסך הראשי, הדביקו בה את הקישור ואז הפעילו עדכונים.</p><button type="button" onClick={()=>void copyLink()}>העתקת קישור לפני התקנה</button></>:<p>אחרי ההוספה פתחו את האפליקציה, התחברו שוב והפעילו את ההתראות.</p>}</div>:!canPush?<p>הדפדפן הזה אינו תומך כרגע בהתראות Push. אפשר להמשיך לעקוב באתר.</p>:<>
      {blocked&&<p>ההתראות חסומות. אפשר לשנות את ההרשאה בהגדרות האתר או המכשיר.</p>}
      {config&&!config.enabled&&<p>עדכוני Push עדיין אינם מופעלים בסביבה הזו.</p>}
      <button type="button" disabled={busy||(!enabled&&(!config?.enabled||blocked))} onClick={()=>void(enabled?disable():enable())}>{busy?'שומרים…':enabled?'הפסקת עדכונים במכשיר':audience==='owner'?'הפעלת התראות להזמנות חדשות':'הפעלת עדכון בטלפון'}</button>
      <span className="push-state" data-testid="push-state">{enabled?'העדכונים פעילים במכשיר הזה':'העדכונים אינם פעילים במכשיר הזה'}</span>
      {hasSubscription&&!enabled&&<><p>אם הגדרות ההתראות השתנו, אפשר לאפס את הרשמת המכשיר. אחר כך צריך להפעיל עדכונים מחדש גם להזמנות אחרות ששמרתם בו.</p><button type="button" disabled={busy} onClick={()=>void resetDevice()}>איפוס הרשמת המכשיר</button></>}
      {audience==='owner'&&<details><summary>מכשירים ישנים או החלפת מכשיר</summary><p>אם הגעתם למגבלת מכשירים, אפשר להפסיק את כל הרשמות ה־Push של החשבון ולהפעיל אותן מחדש במכשירים הרצויים.</p><button type="button" disabled={busy} onClick={()=>void clearOwnerDevices()}>ניקוי הרשמות החשבון</button></details>}
    </>}
    {message&&<p role="status">{message}</p>}
    <small>ללא פרטי לקוח במסך הנעילה. התראה אינה מבטיחה צליל או מסירה מיידית.</small>
  </section>;
}
