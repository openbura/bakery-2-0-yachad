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

  const categoryIds = new Set(categories.map(category => category.id));
  if (!categories.length || !products.length || categoryIds.size !== categories.length ||
    new Set(products.map(product => product.id)).size !== products.length ||
    products.some(product => !categoryIds.has(product.categoryId) || !Number.isSafeInteger(product.priceAgorot) || product.priceAgorot < 0)) {
    throw new OwnerFacingError('הדשבורד נעצר: נתוני הקטלוג אינם תקינים. נסו לרענן.');
  }

  return { categories, products, settings };
}
