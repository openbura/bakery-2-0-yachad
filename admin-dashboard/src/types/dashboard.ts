export type AdminRoute = '/' | '/login' | '/products' | '/settings';

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
