import { CurrencyCircleDollar, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import type { Product } from '../types/dashboard';

type PriceDialogProps = {
  product: Product;
  onClose: () => void;
  onSave: (productId: string, price: number) => void;
};

export function PriceDialog({ product, onClose, onSave }: PriceDialogProps) {
  const [value, setValue] = useState(String(product.price));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, product, saving]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextPrice = Number(value);
    if (!Number.isFinite(nextPrice) || nextPrice <= 0 || !Number.isInteger(nextPrice)) {
      setError('יש להזין מחיר חיובי בשקלים שלמים.');
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      onSave(product.id, nextPrice);
      onClose();
    }, 420);
  };

  const priceDelta = Number(value) - product.price;
  const unusualChange = Number.isFinite(priceDelta) && Math.abs(priceDelta) / product.price > 0.3;

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <section className="price-dialog" role="dialog" aria-modal="true" aria-labelledby="price-dialog-title">
        <div className="dialog-head">
          <span className="dialog-icon"><CurrencyCircleDollar size={24} weight="duotone" /></span>
          <div>
            <p className="eyebrow">עריכת מחיר</p>
            <h2 id="price-dialog-title">{product.name}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="סגירת חלון"><X size={20} /></button>
        </div>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="product-price">מחיר חדש</label>
          <div className={`price-field ${error ? 'has-error' : ''}`}>
            <span aria-hidden="true">₪</span>
            <input
              ref={inputRef}
              id="product-price"
              inputMode="numeric"
              value={value}
              onChange={(event) => { setValue(event.target.value.replace(/[^0-9]/g, '')); setError(''); }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'product-price-error' : unusualChange ? 'product-price-warning' : undefined}
            />
          </div>
          {error && <p className="field-message field-message--error" id="product-price-error">{error}</p>}
          {!error && unusualChange && <p className="field-message field-message--warning" id="product-price-warning">זהו שינוי גדול ביחס למחיר הנוכחי. כדאי לבדוק לפני השמירה.</p>}
          <p className="mock-note">בשלב A השינוי נשמר בהדגמה המקומית בלבד.</p>
          <div className="dialog-actions">
            <button className="button button--ghost" type="button" onClick={onClose} disabled={saving}>ביטול</button>
            <button className="button button--primary" type="submit" disabled={saving}>{saving ? <><span className="spinner" /> שומר…</> : 'שמירת מחיר'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
