import catalog from '../data/public-catalog-fallback.json';
import { getBakerySupabaseClient } from '../lib/bakerySupabaseClient';
import { polishCatalogText } from '../shop/productPolicy';
import { ownerReviewEnabled } from '../shop/release';
import type {
  NoticeType,
  PublicShopSnapshot,
  ShopCategory,
  ShopProduct,
  ShopProductOptionGroup,
  ShopStoreSettings,
} from '../shop/publicShopTypes';

type CategoryRow = { id: string; name_he: string; sort_order: number };
type ProductRow = {
  id: string;
  category_id: string;
  name_he: string;
  description_he: string;
  price_agorot: number;
  image_url: string;
  active: boolean;
  available_today: boolean;
  available_for_delivery: boolean;
  available_for_pickup: boolean;
  sort_order: number;
  has_options: boolean;
  display_price_text: string | null;
  price_unit_note: string | null;
};
type GroupRow = {
  id: string;
  product_id: string;
  code: string;
  name_he: string;
  required: boolean;
  min_select: number;
  max_select: number | null;
  active: boolean;
  sort_order: number;
};
type OptionRow = {
  id: string;
  group_id: string;
  code: string;
  name_he: string;
  price_delta_agorot: number;
  active: boolean;
  sort_order: number;
};
type SettingsRow = {
  ordering_enabled: boolean;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  delivery_fee_agorot: number;
  minimum_delivery_subtotal_agorot: number;
  pickup_fee_agorot: number;
  customer_notice_active: boolean;
  customer_notice_type: string;
  customer_notice_text: string;
  customer_notice_start_at: string | null;
  customer_notice_end_at: string | null;
  updated_at: string;
};

function noticeType(value: string): NoticeType {
  return value === 'warning' || value === 'closed' ? value : 'info';
}

function assertIntegerMoney(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid money field: ${field}`);
  }
  return value;
}

export async function fetchPublicShopSnapshot(signal: AbortSignal = new AbortController().signal): Promise<PublicShopSnapshot> {
  if (ownerReviewEnabled) return getOwnerReviewShopSnapshot();
  const client = getBakerySupabaseClient();
  if (!client) {
    throw new Error('Bakery Supabase is not configured');
  }

  const [categoriesResult, productsResult, groupsResult, optionsResult, settingsResult] = await Promise.all([
    client.from('categories').select('id,name_he,sort_order').eq('active', true).order('sort_order').abortSignal(signal),
    client.from('products').select('id,category_id,name_he,description_he,price_agorot,image_url,active,available_today,available_for_delivery,available_for_pickup,sort_order,has_options,display_price_text,price_unit_note').eq('active', true).order('sort_order').abortSignal(signal),
    client.from('product_option_groups').select('id,product_id,code,name_he,required,min_select,max_select,active,sort_order').eq('active', true).order('sort_order').abortSignal(signal),
    client.from('product_options').select('id,group_id,code,name_he,price_delta_agorot,active,sort_order').eq('active', true).order('sort_order').abortSignal(signal),
    client.from('store_settings').select('ordering_enabled,delivery_enabled,pickup_enabled,delivery_fee_agorot,minimum_delivery_subtotal_agorot,pickup_fee_agorot,customer_notice_active,customer_notice_type,customer_notice_text,customer_notice_start_at,customer_notice_end_at,updated_at').eq('id', 'default').abortSignal(signal).single(),
  ]);

  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

  const firstError = [categoriesResult.error, productsResult.error, groupsResult.error, optionsResult.error, settingsResult.error].find(Boolean);
  if (firstError) {
    throw new Error('Unable to load the live Bakery catalog');
  }

  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const rawProductRows = (productsResult.data ?? []) as ProductRow[];
  const groupRows = (groupsResult.data ?? []) as GroupRow[];
  const optionRows = (optionsResult.data ?? []) as OptionRow[];
  const settingsRow = settingsResult.data as SettingsRow | null;

  if (!settingsRow || ['ordering_enabled', 'delivery_enabled', 'pickup_enabled', 'customer_notice_active'].some(key => typeof settingsRow[key as keyof SettingsRow] !== 'boolean')) throw new Error('The live Bakery settings are invalid');
  for (const rows of [categories, rawProductRows, groupRows, optionRows]) {
    if (rows.some(row => typeof row.id !== 'string' || !row.id) || new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Duplicate or missing catalog identifiers');
  }

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const productRows = rawProductRows.filter(product => categoryById.has(product.category_id) && typeof product.name_he === 'string' && product.name_he.trim() && Number.isSafeInteger(product.price_agorot) && product.price_agorot >= 0);
  const productIds = new Set(productRows.map(product => product.id));
  const publicGroups = groupRows.filter(group => productIds.has(group.product_id));
  const publicGroupIds = new Set(publicGroups.map(group => group.id));
  const optionsByGroup = new Map<string, OptionRow[]>();
  optionRows.filter(option => publicGroupIds.has(option.group_id) && typeof option.name_he === 'string' && typeof option.code === 'string' && Number.isSafeInteger(option.price_delta_agorot) && option.price_delta_agorot >= 0).forEach((option) => optionsByGroup.set(option.group_id, [...(optionsByGroup.get(option.group_id) ?? []), option]));
  const groupsByProduct = new Map<string, ShopProductOptionGroup[]>();
  publicGroups.forEach((group) => {
    const mapped: ShopProductOptionGroup = {
      id: group.id,
      code: group.code,
      name: group.name_he,
      required: group.required,
      minSelect: group.min_select,
      maxSelect: group.max_select,
      active: group.active,
      sortOrder: group.sort_order,
      options: (optionsByGroup.get(group.id) ?? []).map((option) => ({
        id: option.id,
        code: option.code,
        name: option.name_he,
        priceDeltaAgorot: assertIntegerMoney(option.price_delta_agorot, 'price_delta_agorot'),
        active: option.active,
        sortOrder: option.sort_order,
      })),
    };
    groupsByProduct.set(group.product_id, [...(groupsByProduct.get(group.product_id) ?? []), mapped]);
  });

  const products: ShopProduct[] = productRows.map((product) => {
    const category = categoryById.get(product.category_id);
    if (!category) {
      throw new Error('A live product has no public category');
    }
    const optionGroups = groupsByProduct.get(product.id) ?? [];
    const invalidOptions = (product.has_options && optionGroups.length === 0) || optionGroups.some(group =>
      typeof group.code !== 'string' || !group.code.trim() || typeof group.name !== 'string' || !group.name.trim() ||
      typeof group.required !== 'boolean' || !Number.isSafeInteger(group.minSelect) || group.minSelect < (group.required ? 1 : 0) ||
      (group.maxSelect !== null && (!Number.isSafeInteger(group.maxSelect) || group.maxSelect < group.minSelect)) ||
      group.options.length < group.minSelect || new Set(group.options.map(option => option.code)).size !== group.options.length
    ) || new Set(optionGroups.map(group => group.code)).size !== optionGroups.length;
    return {
      id: product.id,
      categoryId: product.category_id,
      category: category.name_he,
      sortOrder: product.sort_order,
      name: polishCatalogText(product.name_he),
      description: polishCatalogText(product.description_he || ''),
      priceAgorot: assertIntegerMoney(product.price_agorot, 'price_agorot'),
      imageUrl: product.image_url,
      active: product.active,
      availableToday: Boolean(product.available_today) && !invalidOptions,
      availableForDelivery: product.available_for_delivery,
      availableForPickup: product.available_for_pickup,
      hasOptions: product.has_options,
      displayPriceText: product.display_price_text,
      priceUnitNote: product.price_unit_note,
      optionGroups,
      unavailableReason: invalidOptions ? 'אפשרויות המוצר אינן זמינות כרגע. אפשר לברר עם המאפייה.' : undefined,
    };
  });

  return {
    source: 'supabase',
    live: true,
    fetchedAt: new Date().toISOString(),
    categories: categories.map<ShopCategory>((category) => ({ id: category.id, name: category.name_he, sortOrder: category.sort_order })),
    products,
    settings: {
      orderingEnabled: settingsRow.ordering_enabled,
      deliveryEnabled: settingsRow.delivery_enabled,
      pickupEnabled: settingsRow.pickup_enabled,
      deliveryFeeAgorot: assertIntegerMoney(settingsRow.delivery_fee_agorot, 'delivery_fee_agorot'),
      minimumDeliverySubtotalAgorot: assertIntegerMoney(settingsRow.minimum_delivery_subtotal_agorot, 'minimum_delivery_subtotal_agorot'),
      pickupFeeAgorot: assertIntegerMoney(settingsRow.pickup_fee_agorot, 'pickup_fee_agorot'),
      customerNoticeActive: settingsRow.customer_notice_active,
      customerNoticeType: noticeType(settingsRow.customer_notice_type),
      customerNoticeText: settingsRow.customer_notice_text,
      customerNoticeStartAt: settingsRow.customer_notice_start_at,
      customerNoticeEndAt: settingsRow.customer_notice_end_at,
      updatedAt: settingsRow.updated_at,
    },
  };
}

export function getFallbackShopSnapshot(): PublicShopSnapshot {
  const categoryNames = Array.from(new Set(catalog.products.map((product) => product.category)));
  const categories = categoryNames.map((name, index) => ({ id: `fallback-${index + 1}`, name, sortOrder: index + 1 }));
  const categoryIdByName = new Map(categories.map((category) => [category.name, category.id]));

  const products: ShopProduct[] = catalog.products.map((product) => ({
    id: product.id,
    categoryId: categoryIdByName.get(product.category) ?? 'fallback',
    category: product.category,
    sortOrder: product.sort_order,
    name: product.product_name,
    description: product.description,
    priceAgorot: Math.round(product.price_ils * 100),
    imageUrl: product.image_url,
    active: product.active,
    availableToday: false,
    availableForDelivery: false,
    availableForPickup: false,
    hasOptions: Boolean(product.option_groups?.length),
    displayPriceText: product.display_price_text || null,
    priceUnitNote: product.price_unit_note || product.small_note || null,
    optionGroups: (product.option_groups ?? []).map((group, groupIndex) => ({
      id: `${product.id}-group-${groupIndex + 1}`,
      code: 'code' in group && typeof group.code === 'string' ? group.code : `group-${String(groupIndex + 1).padStart(2, '0')}`,
      name: group.name,
      required: group.required ?? false,
      minSelect: group.min ?? (group.required ? 1 : 0),
      maxSelect: group.max ?? null,
      active: true,
      sortOrder: groupIndex + 1,
      options: group.options.map((option, optionIndex) => ({
        id: `${product.id}-group-${groupIndex + 1}-option-${optionIndex + 1}`,
        code: 'code' in option && typeof option.code === 'string' ? option.code : `option-${String(optionIndex + 1).padStart(2, '0')}`,
        name: option.name,
        priceDeltaAgorot: Math.round((option.price_delta ?? 0) * 100),
        active: option.active !== false,
        sortOrder: optionIndex + 1,
      })),
    })),
  }));

  const settings: ShopStoreSettings = {
    orderingEnabled: false,
    deliveryEnabled: false,
    pickupEnabled: false,
    deliveryFeeAgorot: 2000,
    minimumDeliverySubtotalAgorot: 7000,
    pickupFeeAgorot: 0,
    customerNoticeActive: false,
    customerNoticeType: 'info',
    customerNoticeText: '',
    customerNoticeStartAt: null,
    customerNoticeEndAt: null,
    updatedAt: new Date(0).toISOString(),
  };

  return { source: 'fallback', live: false, fetchedAt: new Date().toISOString(), categories, products, settings };
}

// Owner approval uses the bundled catalog, independently of the older live database.
// This mode supports product choices and the cart; order submission stays disabled.
export function getOwnerReviewShopSnapshot(): PublicShopSnapshot {
  const snapshot = getFallbackShopSnapshot();
  return {
    ...snapshot,
    source: 'review',
    products: snapshot.products.map(product => ({
      ...product,
      availableToday: true,
      availableForDelivery: true,
      availableForPickup: true,
    })),
    settings: { ...snapshot.settings, orderingEnabled: true, deliveryEnabled: true, pickupEnabled: true },
  };
}
