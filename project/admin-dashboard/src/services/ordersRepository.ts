import { getSupabaseClient } from '../lib/supabaseClient';
import type { OrderItemOptionRow, OrderItemRow, OrderRow, OrderStatusHistoryRow } from '../types/database';
import type { AdminOrder, AdminPickupSlot, OrderStatus } from '../types/dashboard';
import { OwnerFacingError } from './serviceErrors';

async function allPages<T>(query: (offset: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const all: T[] = [];
  for (let offset=0;;offset+=200) { const {data,error}=await query(offset); if(error) throw new OwnerFacingError('לא הצלחנו לטעון את ההזמנות במלואן.'); all.push(...data??[]); if(!data||data.length<200) return all; }
}
export async function fetchOrders(includeArchive=false, signal: AbortSignal = AbortSignal.timeout(12000)): Promise<AdminOrder[]> {
  const client=getSupabaseClient();
  // Active queue is never limited to the latest100. Archive is a separate recent view.
  const active=await allPages<OrderRow>(offset=>client.from('orders').select('*').in('status',['pending_approval','approved','preparing','ready_for_pickup','out_for_delivery']).order('created_at',{ascending:false}).order('id').range(offset,offset+199).abortSignal(signal));
  let rows=active;
  if(includeArchive){const result=await client.from('orders').select('*').in('status',['completed','rejected','cancelled']).order('created_at',{ascending:false}).limit(100).abortSignal(signal);if(result.error)throw new OwnerFacingError('לא הצלחנו לטעון את הארכיון.');rows=[...active,...result.data??[]].sort((a,b)=>b.created_at.localeCompare(a.created_at));}
  const items:OrderItemRow[]=[],history:OrderStatusHistoryRow[]=[],options:OrderItemOptionRow[]=[];
  for(let offset=0;offset<rows.length;offset+=100){const ids=rows.slice(offset,offset+100).map(row=>row.id);const [newItems,newHistory]=await Promise.all([
    allPages<OrderItemRow>(start=>client.from('order_items').select('*').in('order_id',ids).order('created_at').order('id').range(start,start+199).abortSignal(signal)),
    allPages<OrderStatusHistoryRow>(start=>client.from('order_status_history').select('*').in('order_id',ids).order('created_at').order('id').range(start,start+199).abortSignal(signal)),
  ]);items.push(...newItems);history.push(...newHistory);}
  for(let offset=0;offset<items.length;offset+=100){const ids=items.slice(offset,offset+100).map(row=>row.id);options.push(...await allPages<OrderItemOptionRow>(start=>client.from('order_item_options').select('*').in('order_item_id',ids).order('sort_order').order('id').range(start,start+199).abortSignal(signal)));}
  return rows.map(row=>({
    id:row.id,orderNumber:row.order_number,status:row.status as OrderStatus,paymentStatus:row.payment_status,fulfillmentType:row.fulfillment_type,requestedPickupAt:row.requested_pickup_at,promisedBy:null,
    customerName:row.customer_name,phoneE164:row.phone_e164,deliveryAddress:row.delivery_address as Record<string,string>|null,customerNotes:row.customer_notes,
    subtotalAgorot:row.subtotal_agorot,fulfillmentFeeAgorot:row.fulfillment_fee_agorot,totalAgorot:row.total_agorot,rejectionReason:row.rejection_reason,createdAt:row.created_at,updatedAt:row.updated_at,
    items:items.filter(item=>item.order_id===row.id).map(item=>({id:item.id,productName:item.product_name_he,quantity:item.quantity,unitTotalAgorot:item.unit_total_agorot,lineTotalAgorot:item.line_total_agorot,options:options.filter(option=>option.order_item_id===item.id).map(option=>({groupName:option.group_name_he,optionName:option.option_name_he,priceDeltaAgorot:option.price_delta_agorot}))})),
    history:history.filter(entry=>entry.order_id===row.id).map(entry=>({status:entry.to_status as OrderStatus,reason:entry.reason,createdAt:entry.created_at})),
  }));
}
export async function transitionOrder(order:AdminOrder,nextStatus:OrderStatus,reason?:string){
  const {error}=await getSupabaseClient().rpc('transition_bakery_order',{p_order_id:order.id,p_expected_updated_at:order.updatedAt,p_to_status:nextStatus,p_reason:reason?.trim()||null}).abortSignal(AbortSignal.timeout(12000));
  if(error){if(error.message.includes('ORDER_CHANGED'))throw new OwnerFacingError('ההזמנה השתנתה אצל מנהל אחר. בדקו את הסטטוס המעודכן.');if(error.message.includes('REASON_REQUIRED'))throw new OwnerFacingError('כתבו סיבה לדחייה או לביטול.');throw new OwnerFacingError('לא התקבל אישור לעדכון הסטטוס. בדקו את מצב ההזמנה לפני ניסיון נוסף.');}
}
export async function fetchAdminPickupSlots(signal:AbortSignal=AbortSignal.timeout(12000)):Promise<AdminPickupSlot[]>{const {data,error}=await getSupabaseClient().rpc('get_admin_pickup_slots',{p_days:7}).abortSignal(signal);if(error)throw new OwnerFacingError('לא הצלחנו לטעון מועדי איסוף.');return (data??[]).map(slot=>({startsAt:slot.starts_at,capacity:slot.capacity,reserved:slot.reserved,enabled:slot.enabled}));}
export async function updatePickupSlot(slot:AdminPickupSlot,enabled:boolean,capacity=slot.capacity){const {error}=await getSupabaseClient().rpc('set_pickup_slot_override',{p_starts_at:slot.startsAt,p_enabled:enabled,p_capacity:capacity}).abortSignal(AbortSignal.timeout(12000));if(error)throw new OwnerFacingError('לא התקבל אישור לשינוי מועד האיסוף. בדקו את המועד ורעננו.');}
