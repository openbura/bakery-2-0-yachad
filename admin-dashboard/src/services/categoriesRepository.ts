import { getSupabaseClient } from '../lib/supabaseClient';
import type { Category } from '../types/dashboard';
import { OwnerFacingError } from './serviceErrors';

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await getSupabaseClient()
    .from('categories')
    .select('id, name_he, sort_order, active')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new OwnerFacingError('לא הצלחנו לטעון את קטגוריות המוצרים.');

  return data.map((category) => ({
    id: category.id,
    name: category.name_he,
    sortOrder: category.sort_order,
  }));
}
