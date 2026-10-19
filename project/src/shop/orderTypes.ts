import type { FulfillmentType } from './checkoutSession';

export type OrderStatus =
  | 'pending_approval'
  | 'approved'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type PickupSlot = {
  startsAt: string;
  remainingCapacity: number;
};

export type CreateOrderInput = {
  idempotencyKey: string;
  trackingToken: string;
  fulfillmentType: FulfillmentType;
  requestedPickupAt: string | null;
  customerName: string;
  phone: string;
  deliveryAddress: Record<string, string> | null;
  customerNotes: string;
  items: Array<{ product_id: string; quantity: number; option_ids: string[] }>;
  expectedTotalAgorot: number;
};

export type CreatedOrder = {
  orderNumber: number;
  trackingToken: string;
};

export type TrackedOrder = {
  orderId: string;
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: string;
  fulfillmentType: FulfillmentType;
  requestedPickupAt: string | null;
  totalAgorot: number;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{ productName: string; quantity: number; unitTotalAgorot: number; lineTotalAgorot: number; options: Array<{ groupName: string; optionName: string; priceDeltaAgorot: number }> }>;
  history: Array<{ status: OrderStatus; reason: string | null; createdAt: string }>;
};
