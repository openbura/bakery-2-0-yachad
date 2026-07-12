import catalog from '../../product-catalog-yachad.json';
import { getBakerySupabaseClient } from '../lib/bakerySupabaseClient';
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

export async function fetchPublicShopSnapshot(): Promise<PublicShopSnapshot> {
  const client = getBakerySupabaseClient();
  if (!client) {
    throw new Error('Bakery Supabase is not configured');
  }

  const [categoriesResult, productsResult, groupsResult, optionsResult, settingsResult] = await Promise.all([
    client.from('categories').select('id,name_he,sort_order').eq('active', true).order('sort_order'),
    client.from('products').select('id,category_id,name_he,description_he,price_agorot,image_url,active,available_today,available_for_delivery,available_for_pickup,sort_order,has_options,display_price_text,price_unit_note').eq('active', true).order('sort_order'),
    client.from('product_option_groups').select('id,product_id,code,name_he,required,min_select,max_select,active,sort_order').eq('active', true).order('sort_order'),
    client.from('product_options').select('id,group_id,code,name_he,price_delta_agorot,active,sort_order').eq('active', true).order('sort_order'),
    client.from('store_settings').select('ordering_enabled,delivery_enabled,pickup_enabled,delivery_fee_agorot,minimum_delivery_subtotal_agorot,pickup_fee_agorot,customer_notice_active,customer_notice_type,customer_notice_text,customer_notice_start_at,customer_notice_end_at,updated_at').eq('id', 'default').single(),
  ]);

  const firstError = [categoriesResult.error, productsResult.error, groupsResult.error, optionsResult.error, settingsResult.error].find(Boolean);
  if (firstError) {
    throw new Error('Unable to load the live Bakery catalog');
  }

  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const productRows = (productsResult.data ?? []) as ProductRow[];
  const groupRows = (groupsResult.data ?? []) as GroupRow[];
  const optionRows = (optionsResult.data ?? []) as OptionRow[];
  const settingsRow = settingsResult.data as SettingsRow | null;

  if (categories.length !== 10 || productRows.length !== 78 || groupRows.length !== 2 || optionRows.length !== 24 || !settingsRow) {
    throw new Error('The live Bakery catalog is incomplete');
  }

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const optionsByGroup = new Map<string, OptionRow[]>();
  optionRows.forEach((option) => optionsByGroup.set(option.group_id, [...(optionsByGroup.get(option.group_id) ?? []), option]));
  const groupsByProduct = new Map<string, ShopProductOptionGroup[]>();
  groupRows.forEach((group) => {
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
    if (product.has_options !== (optionGroups.length > 0)) {
      throw new Error('A live product has an invalid option contract');
    }
    return {
      id: product.id,
      categoryId: product.category_id,
      category: category.name_he,
      sortOrder: product.sort_order,
      name: product.name_he,
      description: product.description_he,
      priceAgorot: assertIntegerMoney(product.price_agorot, 'price_agorot'),
      imageUrl: product.image_url,
      active: product.active,
      availableToday: product.available_today,
      availableForDelivery: product.available_for_delivery,
      availableForPickup: product.available_for_pickup,
      hasOptions: product.has_options,
      displayPriceText: product.display_price_text,
      priceUnitNote: product.price_unit_note,
      optionGroups,
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
      code: `group-${String(groupIndex + 1).padStart(2, '0')}`,
      name: group.name,
      required: group.required ?? false,
      minSelect: group.min ?? (group.required ? 1 : 0),
      maxSelect: group.max ?? null,
      active: true,
      sortOrder: groupIndex + 1,
      options: group.options.map((option, optionIndex) => ({
        id: `${product.id}-group-${groupIndex + 1}-option-${optionIndex + 1}`,
        code: `option-${String(optionIndex + 1).padStart(2, '0')}`,
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
    deliveryFeeAgorot: 1500,
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
