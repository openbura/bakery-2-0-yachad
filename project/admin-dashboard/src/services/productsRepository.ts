import { getSupabaseClient } from '../lib/supabaseClient';
import type { Category, Product } from '../types/dashboard';
import type { ProductRow } from '../types/database';
import { OwnerFacingError } from './serviceErrors';

const productColumns = 'id, category_id, name_he, description_he, price_unit_note, price_agorot, image_url, active, available_for_delivery, available_for_pickup, available_today, sort_order, updated_at';

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
  | 'description_he'
  | 'price_unit_note'
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
    priceAgorot: row.price_agorot,
    description: row.description_he,
    priceUnitNote: row.price_unit_note,
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
  if (error || !data) throw new OwnerFacingError('לא הצלחנו לאמת את השמירה. רעננו ובדקו את הערך לפני ניסיון נוסף.');
  return mapProduct(data, new Map(categories.map((category) => [category.id, category.name])));
}

export async function updateProductPrice(productId: string, priceAgorot: number, categories: Category[]) {
  if (!Number.isSafeInteger(priceAgorot) || priceAgorot <= 0 || priceAgorot > 2147483647) throw new OwnerFacingError('יש להזין מחיר חיובי ותקין.');
  const { data, error } = await getSupabaseClient()
    .from('products')
    .update({ price_agorot: priceAgorot })
    .eq('id', productId)
    .select('id')
    .single();
  if (error || !data) throw new OwnerFacingError('המחיר לא נשמר. בדקו את החיבור ונסו שוב.');

  const verified = await refetchProduct(productId, categories);
  if (verified.priceAgorot !== priceAgorot) {
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
