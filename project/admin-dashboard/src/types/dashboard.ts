export type AdminRoute = '/' | '/login' | '/orders' | '/products' | '/settings';

export type NoticeType = 'info' | 'warning' | 'closed';

export type AdminRole = 'owner' | 'manager';

export type AdminProfile = {
  userId: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
};

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
};

export type StoreSettings = {
  orderingEnabled: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  noticeActive: boolean;
  noticeType: NoticeType;
  noticeText: string;
  noticeStartAt: string | null;
  noticeEndAt: string | null;
  updatedAt: string;
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  category: string;
  priceAgorot: number;
  description: string;
  priceUnitNote: string | null;
  available: boolean;
  active: boolean;
  availableForDelivery: boolean;
  availableForPickup: boolean;
  imageUrl: string;
  updatedAt: string;
};

export type ToastMessage = {
  id: number;
  tone: 'success' | 'error' | 'info';
  text: string;
};

export type OrderStatus = 'pending_approval' | 'approved' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'completed' | 'rejected' | 'cancelled';

export type AdminOrder = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: string;
  fulfillmentType: 'pickup' | 'delivery';
  requestedPickupAt: string | null;
  promisedBy: string | null;
  customerName: string;
  phoneE164: string;
  deliveryAddress: Record<string, string> | null;
  customerNotes: string;
  subtotalAgorot: number;
  fulfillmentFeeAgorot: number;
  totalAgorot: number;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitTotalAgorot: number;
    lineTotalAgorot: number;
    options: Array<{ groupName: string; optionName: string; priceDeltaAgorot: number }>;
  }>;
  history: Array<{ status: OrderStatus; reason: string | null; createdAt: string }>;
};

export type AdminPickupSlot = { startsAt: string; capacity: number; reserved: number; enabled: boolean };
