import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Basket,
  Copy,
  Minus,
  Plus,
  Storefront,
  Truck,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react';

import catalog from '../product-catalog-yachad.json';
import categoryBreads from './assets/bakery-2/cat-breads.webp';
import categoryCakes from './assets/bakery-2/cat-cakes.webp';
import categoryCoffee from './assets/bakery-2/cat-coffee.webp';
import categoryHosting from './assets/bakery-2/cat-hosting.webp';
import categoryPastries from './assets/bakery-2/cat-pastries.webp';
import categorySavory from './assets/bakery-2/cat-savory.webp';
import shopCoverImage from './assets/bakery-2/shop-cover-yachad.jpg';

type Product = (typeof catalog.products)[number];
type CartItem = {
  product: Product;
  quantity: number;
};
type FulfillmentType = 'pickup' | 'delivery';
type OrderStep = 'catalog' | 'details';
type DeliveryArea = {
  id: string;
  label: string;
  fee_ils: number;
  requiresConfirmation: boolean;
  notes: string;
};

const bakeryWhatsappNumber = '972502696267';
const defaultDeliveryFeeIls = 15;
const minimumDeliverySubtotalIls = 70;
const minimumDeliverySubtotalText = '70₪';

const categoryImages: Record<string, string> = {
  'בורקסים': categoryPastries,
  'פיצות וסמבוסק': categorySavory,
  'סלטים': categoryHosting,
  'כריכים וטוסטים': categorySavory,
  'מתוקים': categoryPastries,
  'לחמי מחמצת': categoryBreads,
  'עוגות': categoryCakes,
  'עוגיות': categoryCakes,
  'לחמניות ובייגלים': categoryBreads,
  'שתייה': categoryCoffee,
};

const ilsFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
});

const products = [...catalog.products].sort((a, b) => a.sort_order - b.sort_order);
const allCategory = 'הכל';

// Demo business rules. Delivery prices can be adjusted later.
const deliveryAreas: DeliveryArea[] = [
  {
    id: 'kfar-saba',
    label: 'כפר סבא',
    fee_ils: defaultDeliveryFeeIls,
    requiresConfirmation: false,
    notes: 'כלל דמו: דמי משלוח קבועים; ניתן לעדכן בהמשך.',
  },
  {
    id: 'hod-hasharon',
    label: 'הוד השרון',
    fee_ils: defaultDeliveryFeeIls,
    requiresConfirmation: false,
    notes: 'כלל דמו: דמי משלוח קבועים; ניתן לעדכן בהמשך.',
  },
  {
    id: 'raanana',
    label: 'רעננה',
    fee_ils: defaultDeliveryFeeIls,
    requiresConfirmation: false,
    notes: 'כלל דמו: דמי משלוח קבועים; ניתן לעדכן בהמשך.',
  },
  {
    id: 'other',
    label: 'אחר / בדיקה מול המאפייה',
    fee_ils: defaultDeliveryFeeIls,
    requiresConfirmation: true,
    notes: 'אזור דורש בדיקה מול המאפייה; דמי המשלוח בדמו נשארים קבועים.',
  },
];

// Helper suggestions only. Free manual typing stays available until a full official street dataset is imported locally.
const streetSuggestionsByCity: Record<string, string[]> = {
  'kfar-saba': ['היוצרים', 'ויצמן', 'רוטשילד', 'בן יהודה', 'ירושלים', 'טשרניחובסקי', 'גלר', 'התע"ש', 'עתיר ידע'],
  'hod-hasharon': ['דרך רמתיים', 'סוקולוב', 'הבנים', 'ז׳בוטינסקי', 'הנשיאים', 'האודם', 'הבנאי', 'החרש'],
  raanana: ['אחוזה', 'ויצמן', 'הרצל', 'ירושלים', 'קרן היסוד', 'בן גוריון', 'החרושת', 'המלאכה'],
  other: [],
};

function formatPrice(value: number) {
  return ilsFormatter.format(value);
}

function normalizeStreetValue(value: string) {
  return value.replace(/[״"']/g, '').replace(/\s+/g, ' ').trim();
}

function getProductDisplayPrice(product: Product) {
  return product.display_price_text || formatPrice(product.price_ils);
}

function getProductUnitNote(product: Product) {
  return product.price_unit_note || product.small_note || '';
}

function formatProductUnitNote(note: string) {
  return note.replace(/₪(\d+)\.00\b/g, '₪$1').replace(/\s*\/\s*/g, ' / ').trim();
}

function shouldShowProductUnitNote(product: Product) {
  const unitNote = getProductUnitNote(product);

  if (!unitNote) {
    return false;
  }

  if (product.category === 'לחמניות ובייגלים' || /\d+\s+יחידות/.test(product.product_name)) {
    return false;
  }

  return !(product.product_name.includes('1 ק״ג') && formatProductUnitNote(unitNote).includes('/ 1 ק״ג'));
}

function getVisibleProductUnitNote(product: Product) {
  return shouldShowProductUnitNote(product) ? formatProductUnitNote(getProductUnitNote(product)) : '';
}

function getCartPriceLine({ product, quantity }: CartItem) {
  const unitNote = getVisibleProductUnitNote(product);
  const unitPrice = quantity > 1 ? `${formatPrice(product.price_ils)} ליח׳` : formatPrice(product.price_ils);
  const totalText = quantity > 1 ? ` · סה״כ ${formatPrice(product.price_ils * quantity)}` : '';

  return `${unitPrice}${unitNote ? ` · ${unitNote}` : ''}${totalText}`;
}

function buildOrderSummary({
  cartItems,
  fulfillment,
  selectedArea,
  customerName,
  phone,
  cityLabel,
  street,
  streetWasTypedManually,
  houseNumber,
  entrance,
  floor,
  apartment,
  notes,
  subtotal,
  deliveryFee,
  total,
}: {
  cartItems: CartItem[];
  fulfillment: FulfillmentType;
  selectedArea?: DeliveryArea;
  customerName: string;
  phone: string;
  cityLabel: string;
  street: string;
  streetWasTypedManually: boolean;
  houseNumber: string;
  entrance: string;
  floor: string;
  apartment: string;
  notes: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
}) {
  const lines = [
    'הזמנה חדשה ממאפיית יחד',
    '',
    'פרטי לקוח:',
    `שם לקוח: ${customerName || 'לא נמסר'}`,
    `טלפון: ${phone || 'לא נמסר'}`,
    '',
    'פרטי קבלה:',
    `שיטת קבלה: ${fulfillment === 'delivery' ? 'משלוח' : 'איסוף עצמי'}`,
  ];

  if (fulfillment === 'delivery') {
    lines.push(`עיר: ${cityLabel || 'לא נבחרה'}`);
    lines.push(`רחוב: ${street || 'לא נמסר'}`);
    lines.push(streetWasTypedManually ? 'רחוב הוזן ידנית — נא לוודא כתובת' : 'רחוב נבחר מהרשימה המקומית');
    lines.push(`מספר בית: ${houseNumber || 'לא נמסר'}`);
    lines.push(`כניסה: ${entrance || '-'}`);
    lines.push(`קומה: ${floor || '-'}`);
    lines.push(`דירה: ${apartment || '-'}`);
    if (selectedArea?.requiresConfirmation) {
      lines.push('אזור משלוח דורש בדיקה מול המאפייה');
    }
  }

  lines.push('', 'פריטים:');
  cartItems.forEach(({ product, quantity }) => {
    const unitNote = getVisibleProductUnitNote(product);
    const unitText = unitNote ? ` (${unitNote})` : '';
    lines.push(`- ${product.product_name} x${quantity} - ${formatPrice(product.price_ils * quantity)}${unitText}`);
  });

  lines.push('');
  lines.push(`סיכום ביניים: ${formatPrice(subtotal)}`);
  lines.push(`דמי משלוח: ${formatPrice(deliveryFee)}`);
  lines.push(`סה״כ הזמנה: ${formatPrice(total)}`);

  if (notes.trim()) {
    lines.push('', `הערות להזמנה: ${notes.trim()}`);
  }

  return lines.join('\n');
}

export default function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState(allCategory);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [orderStep, setOrderStep] = useState<OrderStep>('catalog');
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [cityId, setCityId] = useState('kfar-saba');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [notes, setNotes] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [minimumPromptVisible, setMinimumPromptVisible] = useState(false);
  const [addToastVisible, setAddToastVisible] = useState(false);
  const checkoutStepRef = useRef<HTMLElement | null>(null);

  const categories = useMemo(() => [allCategory, ...Array.from(new Set(products.map((product) => product.category)))], []);
  const visibleProducts = selectedCategory === allCategory
    ? products
    : products.filter((product) => product.category === selectedCategory);
  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountLabel = cartCount === 1 ? 'פריט אחד' : `${cartCount} פריטים`;
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price_ils * item.quantity, 0);
  const selectedArea = deliveryAreas.find((area) => area.id === cityId);
  const selectedStreetSuggestions = cityId ? streetSuggestionsByCity[cityId] ?? [] : [];
  const normalizedStreet = normalizeStreetValue(street);
  const streetSelectedFromList = selectedStreetSuggestions.some(
    (suggestion) => normalizeStreetValue(suggestion) === normalizedStreet,
  );
  const streetWasTypedManually = fulfillment === 'delivery' && normalizedStreet.length > 0 && !streetSelectedFromList;
  const deliveryFee = fulfillment === 'delivery' ? selectedArea?.fee_ils ?? defaultDeliveryFeeIls : 0;
  const total = subtotal + deliveryFee;
  const deliveryMinimumNotMet =
    fulfillment === 'delivery' && cartItems.length > 0 && subtotal < minimumDeliverySubtotalIls;
  const deliveryMinimumMissing = Math.max(0, minimumDeliverySubtotalIls - subtotal);
  const deliveryAddressReady =
    fulfillment === 'pickup' ||
    (cityId.trim().length > 0 && street.trim().length > 1 && houseNumber.trim().length > 0);
  const orderSummary = buildOrderSummary({
    cartItems,
    fulfillment,
    selectedArea,
    customerName,
    phone,
    cityLabel: selectedArea?.label ?? '',
    street,
    streetWasTypedManually,
    houseNumber,
    entrance,
    floor,
    apartment,
    notes,
    subtotal,
    deliveryFee,
    total,
  });
  const canSendOrder =
    cartItems.length > 0 &&
    customerName.trim().length > 1 &&
    phone.trim().length >= 8 &&
    deliveryAddressReady &&
    !deliveryMinimumNotMet;
  const canAttemptContinue = cartItems.length > 0;
  const whatsappHref = `https://wa.me/${bakeryWhatsappNumber}?text=${encodeURIComponent(orderSummary)}`;
  const checkoutTitle = fulfillment === 'delivery' ? 'פרטי משלוח' : 'פרטי איסוף';
  const checkoutSubtitle =
    fulfillment === 'delivery'
      ? 'נשלים כתובת וטלפון לשליחת ההזמנה למאפייה.'
      : 'נשלים פרטי קשר והערות, בלי כתובת למשלוח.';

  useEffect(() => {
    if (!addToastVisible) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setAddToastVisible(false), 1400);

    return () => window.clearTimeout(timeout);
  }, [addToastVisible]);

  useEffect(() => {
    if (orderStep !== 'details') {
      return;
    }

    window.requestAnimationFrame(() => {
      checkoutStepRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
      const firstField = checkoutStepRef.current?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input:not([type="radio"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      firstField?.focus({ preventScroll: true });
    });
  }, [orderStep]);

  useEffect(() => {
    if (!minimumPromptVisible || !deliveryMinimumNotMet) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.querySelector('.shop-minimum-popover, #shop-minimum-hint')?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    });
  }, [minimumPromptVisible, deliveryMinimumNotMet, deliveryMinimumMissing]);

  const renderFulfillmentSelector = (variant: 'summary' | 'form') => (
    <div className={`shop-fulfillment-block shop-fulfillment-block--${variant}`}>
      <div className="shop-choice-row" role="radiogroup" aria-label="שיטת קבלה">
        <label className={fulfillment === 'delivery' ? 'is-selected' : undefined}>
          <input
            checked={fulfillment === 'delivery'}
            name={`fulfillment-${variant}`}
            type="radio"
            onChange={() => {
              setFulfillment('delivery');
              setMinimumPromptVisible(false);
            }}
          />
          <Truck size={19} weight="bold" />
          משלוח
        </label>
        <label className={fulfillment === 'pickup' ? 'is-selected' : undefined}>
          <input
            checked={fulfillment === 'pickup'}
            name={`fulfillment-${variant}`}
            type="radio"
            onChange={() => {
              setFulfillment('pickup');
              setMinimumPromptVisible(false);
            }}
          />
          <Storefront size={19} weight="bold" />
          איסוף עצמי
        </label>
      </div>
      <p className="shop-fulfillment-note">
        {fulfillment === 'delivery'
          ? `דמי משלוח ${formatPrice(deliveryFee)} · מינימום הזמנה למשלוח ${minimumDeliverySubtotalText}`
          : 'איסוף עצמי ללא דמי משלוח'}
      </p>
    </div>
  );

  const scrollShopTop = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      document.querySelector('.shop-shell')?.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  };

  const goToOrderDetails = () => {
    if (deliveryMinimumNotMet) {
      setMinimumPromptVisible(true);
      setAddToastVisible(false);
      setCartOpen(true);
      return;
    }

    if (!canAttemptContinue) {
      return;
    }

    setOrderStep('details');
    setCartOpen(false);
    setCopyStatus('');
    setMinimumPromptVisible(false);
  };

  const goToCatalog = () => {
    setOrderStep('catalog');
    setCartOpen(false);
    setCopyStatus('');
    scrollShopTop();
  };

  const openCartPanel = () => {
    setAddToastVisible(false);
    setCartOpen(true);
  };

  const addToCart = (product: Product) => {
    setMinimumPromptVisible(false);
    setAddToastVisible(false);
    setCart((current) => ({
      ...current,
      [product.id]: {
        product,
        quantity: (current[product.id]?.quantity ?? 0) + 1,
      },
    }));
    window.requestAnimationFrame(() => setAddToastVisible(true));
  };

  const updateQuantity = (productId: string, nextQuantity: number) => {
    setMinimumPromptVisible(false);
    setCart((current) => {
      const next = { ...current };
      if (nextQuantity <= 0) {
        delete next[productId];
      } else if (next[productId]) {
        next[productId] = { ...next[productId], quantity: nextQuantity };
      }
      return next;
    });
  };

  const copyOrderSummary = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(orderSummary);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = orderSummary;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      setCopyStatus('הסיכום הועתק');
    } catch {
      setCopyStatus('לא הצלחנו להעתיק אוטומטית');
    }
  };

  return (
    <main className={`shop-shell ${orderStep === 'details' ? 'is-details-step' : ''}`} dir="rtl">
      {orderStep === 'details' && (
        <header className="shop-topbar" aria-label="ניווט חנות">
          <button className="shop-back-link shop-back-link--button" type="button" onClick={goToCatalog}>
            <ArrowRight size={20} weight="bold" />
            חזרה לתפריט
          </button>
        </header>
      )}

      {orderStep === 'catalog' && (
        <section className="shop-cover" aria-label="מאפיית יחד - מאפים טריים כל יום">
          <img src={shopCoverImage} alt="מאפיית יחד - טרי, איכותי, מהלב. מאפים טריים, כל יום, באהבה." decoding="async" />
          <a className="shop-cover-link" href="/">
            <ArrowRight size={19} weight="bold" />
            לאתר המאפייה
          </a>
        </section>
      )}

      <div className={`shop-layout ${orderStep === 'details' ? 'is-checkout-step' : ''}`}>
        {orderStep === 'catalog' ? (
          <section className="shop-products" aria-label="תפריט מאפיית יחד">

            <div className="shop-category-tabs" aria-label="סינון קטגוריות">
              {categories.map((category) => (
                <button
                  key={category}
                  className={selectedCategory === category ? 'is-active' : undefined}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                >
                  <span>{category}</span>
                </button>
              ))}
            </div>

            <div className="shop-grid">
              {visibleProducts.map((product, index) => (
                <article className="shop-product-card" key={product.id}>
                  <div className={`shop-product-media ${product.image_url ? 'has-product-image' : 'is-fallback-image'}`}>
                    <img
                      src={product.image_url || categoryImages[product.category] || categoryHosting}
                      alt=""
                      loading={product.image_url && index > 5 ? 'lazy' : 'eager'}
                      fetchPriority={index < 4 ? 'high' : 'auto'}
                      decoding="async"
                    />
                  </div>
                  <div className="shop-product-body">
                    <div>
                      <h3>{product.product_name}</h3>
                      {product.description ? <p>{product.description}</p> : null}
                    </div>
                    <div className="shop-product-foot">
                      <div className="shop-price-stack">
                        <strong><bdi>{getProductDisplayPrice(product)}</bdi></strong>
                        {getVisibleProductUnitNote(product) && <span><bdi>{getVisibleProductUnitNote(product)}</bdi></span>}
                      </div>
                      <button type="button" onClick={() => addToCart(product)}>
                        <Plus size={18} weight="bold" />
                        הוספה
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="shop-checkout-step" ref={checkoutStepRef} aria-labelledby="checkout-title">
            <div className="shop-checkout-card">
              <div className="shop-checkout-title">
                <span className="shop-kicker">פרטי הזמנה</span>
                <h1 id="checkout-title">{checkoutTitle}</h1>
                <p>{checkoutSubtitle}</p>
              </div>

              <form className="shop-checkout-form shop-checkout-form--page">
                <div className="shop-form-panel shop-form-panel--fulfillment">
                  {renderFulfillmentSelector('form')}
                </div>

                <div className="shop-form-panel">
                  <div className="shop-form-title">פרטי לקוח</div>
                  <div className="shop-form-grid shop-form-grid--customer">
                    <label>
                      שם מלא
                      <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="שם המזמין/ה" />
                    </label>
                    <label>
                      טלפון
                      <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="050-0000000" />
                    </label>
                  </div>
                </div>

                {fulfillment === 'delivery' ? (
                  <div className="shop-form-panel shop-form-panel--address">
                    <div className="shop-form-title">כתובת למשלוח</div>
                    <div className="shop-form-grid shop-form-grid--address-main">
                        <label>
                          עיר
                          <select
                            value={cityId}
                            onChange={(event) => {
                              setCityId(event.target.value);
                              setStreet('');
                            }}
                            required
                          >
                            <option value="">בחרו עיר</option>
                            {deliveryAreas.map((area) => (
                              <option key={area.id} value={area.id}>
                                {area.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          רחוב
                          <input
                            value={street}
                            onChange={(event) => setStreet(event.target.value)}
                            list={cityId ? 'shop-street-suggestions' : undefined}
                            placeholder={cityId ? 'התחילו להקליד רחוב' : 'בחרו עיר קודם'}
                            disabled={!cityId}
                            required
                          />
                        </label>
                    </div>
                    <datalist id="shop-street-suggestions">
                      {selectedStreetSuggestions.map((suggestion) => (
                        <option key={suggestion} value={suggestion} />
                      ))}
                    </datalist>
                    <p className="shop-field-note">אם הרחוב לא מופיע, אפשר להקליד ידנית.</p>
                    {streetWasTypedManually && (
                      <p className="shop-warning">רחוב הוזן ידנית — נא לוודא כתובת.</p>
                    )}
                    {selectedArea?.requiresConfirmation && (
                      <p className="shop-warning">אזור זה ייבדק מול המאפייה לפני אישור משלוח.</p>
                    )}
                    <div className="shop-address-grid">
                      <label>
                        מספר בית
                        <input value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} inputMode="numeric" required />
                      </label>
                      <label>
                        כניסה
                        <input value={entrance} onChange={(event) => setEntrance(event.target.value)} placeholder="א / ב / ג" />
                      </label>
                      <label>
                        קומה
                        <input value={floor} onChange={(event) => setFloor(event.target.value)} inputMode="numeric" />
                      </label>
                      <label>
                        דירה
                        <input value={apartment} onChange={(event) => setApartment(event.target.value)} inputMode="numeric" />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="shop-form-panel shop-form-panel--pickup">
                    <div className="shop-form-title">איסוף עצמי</div>
                    <p className="shop-field-note">אין צורך בכתובת לאיסוף עצמי.</p>
                  </div>
                )}

                <div className="shop-form-panel">
                  <label>
                    הערות להזמנה
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="קוד בלובי, להשאיר מחוץ לדלת, להתקשר כשמגיעים"
                      rows={3}
                    />
                  </label>
                </div>
              </form>
            </div>
          </section>
        )}

        <aside
          className={`shop-cart-panel ${cartOpen ? 'is-open' : ''} ${orderStep === 'details' ? 'is-checkout-summary' : ''}`}
          aria-label="ההזמנה שלי"
        >
          <div className="shop-cart-head">
            <h2>ההזמנה שלי</h2>
            <button className="shop-cart-close" type="button" onClick={() => setCartOpen(false)} aria-label="סגור הזמנה">
              <X size={20} weight="bold" />
            </button>
          </div>

          {orderStep === 'catalog' && renderFulfillmentSelector('summary')}

          <div className="shop-cart-scroll">
            {cartItems.length ? (
              <div className="shop-cart-items">
                {cartItems.map(({ product, quantity }) => (
                  <div className="shop-cart-item" key={product.id}>
                    <div>
                      <strong>{product.product_name}</strong>
                      <span><bdi>{getCartPriceLine({ product, quantity })}</bdi></span>
                    </div>
                    <div className="shop-quantity">
                      <button type="button" onClick={() => updateQuantity(product.id, quantity - 1)} aria-label="הפחת כמות">
                        <Minus size={16} weight="bold" />
                      </button>
                      <span>{quantity}</span>
                      <button type="button" onClick={() => updateQuantity(product.id, quantity + 1)} aria-label="הוסף כמות">
                        <Plus size={16} weight="bold" />
                      </button>
                      <button
                        className="shop-remove-item"
                        type="button"
                        onClick={() => updateQuantity(product.id, 0)}
                        aria-label="הסר מוצר"
                      >
                        הסר
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="shop-empty-cart">
                <strong>הסל שלך ריק</strong>
              </div>
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="shop-totals" aria-live="polite">
              <div>
                <span>סכום ביניים</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <div>
                <span>דמי משלוח</span>
                <strong>{formatPrice(deliveryFee)}</strong>
              </div>
              {fulfillment === 'delivery' && (
                <div className="shop-rule-line">
                  <span>מינימום הזמנה למשלוח:</span>
                  <strong>{minimumDeliverySubtotalText}</strong>
                </div>
              )}
              <div className="shop-total-line">
                <span>סה״כ הזמנה</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              {deliveryMinimumNotMet && (
                <p className="shop-minimum-note" id="shop-minimum-hint">
                  <strong>מינימום הזמנה למשלוח הוא {minimumDeliverySubtotalText}</strong>
                  <span>הוסיפו עוד {formatPrice(deliveryMinimumMissing)} כדי להמשיך למשלוח</span>
                </p>
              )}
            </div>
          )}

          {orderStep === 'catalog' ? (
            <div className="shop-summary-actions">
              <button
                className={`shop-continue-button ${deliveryMinimumNotMet ? 'is-blocked-by-minimum' : ''}`}
                type="button"
                onClick={goToOrderDetails}
                disabled={!canAttemptContinue}
                aria-describedby={deliveryMinimumNotMet ? 'shop-minimum-hint' : undefined}
              >
                המשך לפרטי הזמנה
              </button>
              {minimumPromptVisible && deliveryMinimumNotMet && (
                <div className="shop-minimum-popover" role="status" aria-live="polite">
                  <strong>חסרים עוד {formatPrice(deliveryMinimumMissing)} להזמנת מינימום</strong>
                  <span>בחרו פריט נוסף כדי להמשיך למשלוח.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="shop-actions">
              <a
                className={`shop-whatsapp-button ${canSendOrder ? '' : 'is-disabled'}`}
                href={canSendOrder ? whatsappHref : '#'}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!canSendOrder}
                onClick={(event) => {
                  if (!canSendOrder) {
                    event.preventDefault();
                  }
                }}
              >
                <WhatsappLogo size={21} weight="bold" />
                שליחת הזמנה בוואטסאפ
              </a>
              <button className="shop-copy-button" type="button" onClick={copyOrderSummary} disabled={!canSendOrder}>
                <Copy size={18} weight="bold" />
                העתקת הזמנה
              </button>
              {copyStatus && <span className="shop-copy-status">{copyStatus}</span>}
            </div>
          )}
        </aside>
      </div>

      {cartCount > 0 && orderStep === 'catalog' && (
        <button className="shop-mobile-cart-button" type="button" onClick={openCartPanel}>
          <Basket size={21} weight="bold" />
          {`ההזמנה שלי · ${cartCountLabel} · ${formatPrice(total)}`}
        </button>
      )}

      {addToastVisible && orderStep === 'catalog' && (
        <div className="shop-add-toast" role="status" aria-live="polite">
          נוסף להזמנה
        </div>
      )}
    </main>
  );
}
