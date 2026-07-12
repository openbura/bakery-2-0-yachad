import { getSupabaseClient } from '../lib/supabaseClient';
import type { Category, Product } from '../types/dashboard';
import type { ProductRow } from '../types/database';
import { OwnerFacingError } from './serviceErrors';

const productColumns = 'id, category_id, name_he, price_agorot, image_url, active, available_for_delivery, available_for_pickup, available_today, sort_order, updated_at';

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value));
}

function mapProduct(row: Pick<ProductRow,
  | 'id'
  | 'category_id'
  | 'name_he'
  | 'price_agorot'
  | 'image_url'
  | 'active'
  | 'available_for_delivery'
  | 'available_for_pickup'
  | 'available_today'
  | 'updated_at'
>, categories: Map<string, string>): Product {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name_he,
    category: categories.get(row.category_id) ?? 'ללא קטגוריה',
    price: row.price_agorot / 100,
    available: row.available_today,
    active: row.active,
    availableForDelivery: row.available_for_delivery,
    availableForPickup: row.available_for_pickup,
    imageUrl: row.image_url,
    updatedAt: formatUpdatedAt(row.updated_at),
  };
}

export async function fetchProducts(categories: Category[]): Promise<Product[]> {
  const { data, error } = await getSupabaseClient()
    .from('products')
    .select(productColumns)
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new OwnerFacingError('לא הצלחנו לטעון את המוצרים.');
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  return data.map((row) => mapProduct(row, categoryNames));
}

async function refetchProduct(productId: string, categories: Category[]) {
  const { data, error } = await getSupabaseClient()
    .from('products')
    .select(productColumns)
    .eq('id', productId)
    .single();
  if (error || !data) throw new OwnerFacingError('השינוי נשמר, אך לא הצלחנו לאמת את המוצר המעודכן.');
  return mapProduct(data, new Map(categories.map((category) => [category.id, category.name])));
}

export function shekelsToAgorot(priceShekels: number) {
  if (!Number.isFinite(priceShekels) || priceShekels <= 0) {
    throw new OwnerFacingError('יש להזין מחיר חיובי ותקין.');
  }
  const agorot = Math.round((priceShekels + Number.EPSILON) * 100);
  if (Math.abs(agorot / 100 - priceShekels) > 0.00001) {
    throw new OwnerFacingError('ניתן להזין עד שתי ספרות אחרי הנקודה.');
  }
  return agorot;
}

export async function updateProductPrice(productId: string, priceShekels: number, categories: Category[]) {
  const priceAgorot = shekelsToAgorot(priceShekels);
  const { data, error } = await getSupabaseClient()
    .from('products')
    .update({ price_agorot: priceAgorot })
    .eq('id', productId)
    .select('id')
    .single();
  if (error || !data) throw new OwnerFacingError('המחיר לא נשמר. בדקו את החיבור ונסו שוב.');

  const verified = await refetchProduct(productId, categories);
  if (shekelsToAgorot(verified.price) !== priceAgorot) {
    throw new OwnerFacingError('המחיר המרוחק לא תאם לערך שנשמר.');
  }
  return verified;
}

export async function updateProductAvailability(productId: string, availableToday: boolean, categories: Category[]) {
  const { data, error } = await getSupabaseClient()
    .from('products')
    .update({ available_today: availableToday })
    .eq('id', productId)
    .select('id')
    .single();
  if (error || !data) throw new OwnerFacingError('הזמינות לא נשמרה. בדקו את החיבור ונסו שוב.');

  const verified = await refetchProduct(productId, categories);
  if (verified.available !== availableToday) {
    throw new OwnerFacingError('מצב הזמינות המרוחק לא תאם לערך שנשמר.');
  }
  return verified;
}
