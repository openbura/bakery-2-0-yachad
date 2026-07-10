import type { Product, StoreSettings } from '../types/dashboard';
import catalogSeed from './catalogSeed.json';

type CatalogSeedProduct = {
  id: string;
  product_name: string;
  category: string;
  price_ils: number;
  active: boolean;
  available_for_delivery: boolean;
  available_for_pickup: boolean;
  image_url: string;
  sort_order: number;
};

export const initialStoreSettings: StoreSettings = {
  orderingEnabled: true,
  deliveryEnabled: true,
  pickupEnabled: true,
  noticeActive: true,
  noticeType: 'information',
  noticeText: 'קיים כרגע עומס, זמן ההכנה ארוך מהרגיל.',
  updatedAt: 'היום, 09:42',
};

const catalogProducts = catalogSeed.products as CatalogSeedProduct[];

// Stage A.1 keeps a local snapshot so the dashboard remains runtime-isolated from the storefront.
export const initialProducts: Product[] = [...catalogProducts]
  .sort((first, second) => first.sort_order - second.sort_order)
  .map((product) => ({
    id: product.id,
    name: product.product_name,
    category: product.category,
    price: product.price_ils,
    active: product.active,
    availableForDelivery: product.available_for_delivery,
    availableForPickup: product.available_for_pickup,
    available: product.active && (product.available_for_delivery || product.available_for_pickup),
    imageUrl: product.image_url,
    updatedAt: 'נתוני הקטלוג',
  }));
