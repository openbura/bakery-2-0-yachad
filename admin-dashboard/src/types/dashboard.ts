export type AdminRoute = '/' | '/login' | '/products' | '/settings';

export type NoticeType = 'information' | 'warning' | 'closed';

export type StoreSettings = {
  orderingEnabled: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  noticeActive: boolean;
  noticeType: NoticeType;
  noticeText: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
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
