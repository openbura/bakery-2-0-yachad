export type PushAudience='customer'|'owner';
export type PushRpcClient={rpc(name:string,args:Record<string,unknown>):{abortSignal(signal:AbortSignal):PromiseLike<{data:unknown;error:unknown}>}};
export function makePushApi(client:()=>PushRpcClient|null){
  return async (name:string,args:Record<string,unknown>)=>{
    const value=client();if(!value)throw new Error('החיבור לעדכונים אינו זמין כרגע.');
    const {data,error}=await value.rpc(name,args).abortSignal(AbortSignal.timeout(12000));
    if(error)throw new Error('לא הצלחנו לשמור את הגדרת העדכונים. אפשר לנסות שוב; מצב ההזמנה באתר ממשיך להתעדכן.');
    return data;
  };
}
export type PushApi=ReturnType<typeof makePushApi>;
export async function unsubscribeOwnerDevice(api:PushApi){
  if(!('serviceWorker'in navigator))return true;
  try{const registration=await navigator.serviceWorker.getRegistration('/');const subscription=await registration?.pushManager.getSubscription();if(!subscription)return true;
    let removed=false;try{const secret=localStorage.getItem('yachad-push-device-v1');if(secret){await api('remove_bakery_push',{p_audience:'owner',p_tracking_token:null,p_endpoint:subscription.endpoint,p_device_secret:secret});removed=true;}}catch{/* Platform cancellation remains available even if the API is offline. */}
    try{return await subscription.unsubscribe()||removed;}catch{return removed;}
  }catch{return false;}
}
