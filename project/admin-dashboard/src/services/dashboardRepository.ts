import type { Category, Product, StoreSettings } from '../types/dashboard';
import { fetchCategories } from './categoriesRepository';
import { fetchProducts } from './productsRepository';
import { OwnerFacingError } from './serviceErrors';
import { fetchStoreSettings } from './storeSettingsRepository';

export type DashboardData = {
  categories: Category[];
  products: Product[];
  settings: StoreSettings;
};

export async function fetchDashboardData(): Promise<DashboardData> {
  const categories = await fetchCategories();
  const [products, settings] = await Promise.all([
    fetchProducts(categories),
    fetchStoreSettings(),
  ]);

  if (categories.length !== 10 || products.length !== 78) {
    throw new OwnerFacingError('הדשבורד נעצר: מספר המוצרים או הקטגוריות אינו תואם לקטלוג המאושר.');
  }

  return { categories, products, settings };
}
