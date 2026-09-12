export type NoticeType = 'info' | 'warning' | 'closed';

export type ShopCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

export type ShopProductOption = {
  id: string;
  code: string;
  name: string;
  priceDeltaAgorot: number;
  active: boolean;
  sortOrder: number;
};

export type ShopProductOptionGroup = {
  id: string;
  code: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number | null;
  active: boolean;
  sortOrder: number;
  options: ShopProductOption[];
};

export type ShopProduct = {
  id: string;
  categoryId: string;
  category: string;
  sortOrder: number;
  name: string;
  description: string;
  priceAgorot: number;
  imageUrl: string;
  active: boolean;
  availableToday: boolean;
  availableForDelivery: boolean;
  availableForPickup: boolean;
  hasOptions: boolean;
  displayPriceText: string | null;
  priceUnitNote: string | null;
  optionGroups: ShopProductOptionGroup[];
};

export type ShopStoreSettings = {
  orderingEnabled: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryFeeAgorot: number;
  minimumDeliverySubtotalAgorot: number;
  pickupFeeAgorot: number;
  customerNoticeActive: boolean;
  customerNoticeType: NoticeType;
  customerNoticeText: string;
  customerNoticeStartAt: string | null;
  customerNoticeEndAt: string | null;
  updatedAt: string;
};

export type PublicShopSnapshot = {
  source: 'supabase' | 'fallback';
  live: boolean;
  fetchedAt: string;
  categories: ShopCategory[];
  products: ShopProduct[];
  settings: ShopStoreSettings;
};

export type CartSelection = {
  groupId: string;
  groupCode: string;
  groupName: string;
  optionId: string;
  optionCode: string;
  optionName: string;
  priceDeltaAgorot: number;
};

export type ShopCartItem = {
  id: string;
  productId: string;
  product: ShopProduct;
  quantity: number;
  selections: CartSelection[];
  unitPriceAgorot: number;
  invalidReason?: string;
};
