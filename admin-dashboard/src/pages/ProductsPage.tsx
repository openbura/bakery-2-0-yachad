import {
  Check,
  Funnel,
  MagnifyingGlass,
  Package,
  PencilSimple,
  Warning,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { PriceDialog } from '../components/PriceDialog';
import type { Category, Product } from '../types/dashboard';

type ProductsPageProps = {
  products: Product[];
  categories: Category[];
  savingProductId: string | null;
  onToggleAvailability: (productId: string) => Promise<void>;
  onUpdatePrice: (productId: string, price: number) => Promise<void>;
};

export function ProductsPage({ products, categories, savingProductId, onToggleAvailability, onUpdatePrice }: ProductsPageProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const visibleProducts = products.filter((product) => {
    const matchesQuery = product.name.includes(query.trim());
    const matchesCategory = category === 'all' || product.categoryId === category;
    const matchesAvailability = availability === 'all' || (availability === 'available' ? product.available : !product.available);
    return matchesQuery && matchesCategory && matchesAvailability;
  });
  const availableCount = products.filter((product) => product.available).length;
  const unavailableCount = products.length - availableCount;

  const clearFilters = () => { setQuery(''); setCategory('all'); setAvailability('all'); };

  return (
    <div className="page-stack">
      <header className="page-header products-header">
        <div><p className="eyebrow">ניהול מוצרים</p><h1>מה זמין היום?</h1><p>עדכון מהיר של מלאי ומחיר, בלי לשנות את מבנה הקטלוג.</p></div>
        <div className="count-summary" aria-label="סיכום זמינות"><span><Check size={18} weight="bold" />{availableCount} במלאי</span><span className="is-warning"><Warning size={18} weight="fill" />{unavailableCount} אזלו</span></div>
      </header>

      <section className="filter-bar" aria-label="סינון מוצרים">
        <label className="search-field"><MagnifyingGlass size={20} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש לפי שם מוצר" aria-label="חיפוש לפי שם מוצר" /></label>
        <label className="select-field"><Funnel size={18} /><span className="sr-only">קטגוריה</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">הכול</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="select-field"><Package size={18} /><span className="sr-only">זמינות</span><select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">הכול</option><option value="available">זמינים</option><option value="unavailable">אזלו</option></select></label>
      </section>

      <section className="products-workspace">
        <div className="products-workspace__head"><span role="status">{visibleProducts.length} מוצרים מוצגים</span><small>נתונים חיים ממסד המאפייה</small></div>
        {visibleProducts.length === 0 ? <EmptyState onClear={clearFilters} /> : (
          <>
            <div className="product-table" role="table" aria-label="רשימת מוצרים">
              <div className="product-table__header" role="row"><span role="columnheader">מוצר</span><span role="columnheader">קטגוריה</span><span role="columnheader">מחיר</span><span role="columnheader">זמינות</span><span role="columnheader">עדכון אחרון</span><span role="columnheader" className="sr-only">פעולות</span></div>
              {visibleProducts.map((product) => (
                <div className="product-row" role="row" key={product.id}>
                  <div className="product-identity" role="cell"><span className="product-monogram">{product.name.charAt(0)}</span><strong>{product.name}</strong></div>
                  <span className="category-chip" role="cell">{product.category}</span>
                  <strong className="product-price" role="cell"><bdi dir="ltr">₪{product.price}</bdi></strong>
                  <button className={`availability-button ${product.available ? 'is-available' : 'is-unavailable'}`} type="button" onClick={() => void onToggleAvailability(product.id)} disabled={savingProductId === product.id} aria-busy={savingProductId === product.id} role="cell"><span />{savingProductId === product.id ? 'שומר…' : product.available ? 'במלאי' : 'אזל להיום'}</button>
                  <span className="updated-time" role="cell">{product.updatedAt}</span>
                  <button className="edit-price-button" type="button" onClick={() => setEditingProduct(product)} disabled={savingProductId === product.id} aria-label={`עריכת מחיר עבור ${product.name}`}><PencilSimple size={19} /> עריכת מחיר</button>
                </div>
              ))}
            </div>

            <div className="product-cards">
              {visibleProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-card__head"><span className="product-monogram">{product.name.charAt(0)}</span><div><strong>{product.name}</strong><small>{product.category}</small></div><strong className="product-price"><bdi dir="ltr">₪{product.price}</bdi></strong></div>
                  <div className="product-card__meta"><span>עודכן {product.updatedAt}</span><span className={product.available ? 'text-positive' : 'text-warning'}>{product.available ? 'מוכן למכירה' : 'לא ניתן להוסיף להזמנה'}</span></div>
                  <div className="product-card__actions"><button className={`availability-button ${product.available ? 'is-available' : 'is-unavailable'}`} type="button" onClick={() => void onToggleAvailability(product.id)} disabled={savingProductId === product.id} aria-busy={savingProductId === product.id}><span />{savingProductId === product.id ? 'שומר…' : product.available ? 'במלאי' : 'אזל להיום'}</button><button className="edit-price-button" type="button" onClick={() => setEditingProduct(product)} disabled={savingProductId === product.id}><PencilSimple size={19} /> עריכת מחיר</button></div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {editingProduct && <PriceDialog key={editingProduct.id} product={editingProduct} onClose={() => setEditingProduct(null)} onSave={onUpdatePrice} />}
    </div>
  );
}
