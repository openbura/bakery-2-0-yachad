import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Basket,
  Copy,
  ImageSquare,
  Minus,
  Plus,
  Storefront,
  Truck,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react';

import catalog from '../product-catalog-yachad.json';
import shopCoverImage from './assets/bakery-2/shop-cover-yachad.jpg';

type Product = (typeof catalog.products)[number];
type ProductOption = {
  name: string;
  price_delta?: number;
  active?: boolean;
};
type ProductOptionGroup = {
  name: string;
  required?: boolean;
  min?: number;
  max?: number | null;
  options: ProductOption[];
};
type ProductWithOptions = Product & {
  option_groups?: ProductOptionGroup[];
};
type CartSelection = {
  groupName: string;
  optionName: string;
  priceDelta: number;
};
type CartItem = {
  id: string;
  product: ProductWithOptions;
  quantity: number;
  selections?: CartSelection[];
  unitPriceIls: number;
};
type FulfillmentType = 'pickup' | 'delivery';
type ResidenceType = '' | 'building' | 'private-house';
type OrderStep = 'catalog' | 'details';
type CheckoutField =
  | 'customerName'
  | 'phone'
  | 'cityId'
  | 'street'
  | 'houseNumber'
  | 'residenceType'
  | 'floor'
  | 'apartment'
  | 'notes'
  | 'order';
type CheckoutErrors = Partial<Record<CheckoutField, string>>;
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

const ilsFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
});

const products = [...(catalog.products as ProductWithOptions[])].sort((a, b) => a.sort_order - b.sort_order);
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

function formatPrice(value: number) {
  return ilsFormatter.format(value);
}

function isValidIsraeliPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return /^0(?:5\d{8}|7\d{8}|[23489]\d{7})$/.test(digits);
}

function getProductDisplayPrice(product: ProductWithOptions) {
  return product.display_price_text || formatPrice(product.price_ils);
}

function getProductUnitNote(product: ProductWithOptions) {
  return product.price_unit_note || product.small_note || '';
}

function formatProductUnitNote(note: string) {
  return note.replace(/₪(\d+)\.00\b/g, '₪$1').replace(/\s*\/\s*/g, ' / ').trim();
}

function shouldShowProductUnitNote(product: ProductWithOptions) {
  const unitNote = getProductUnitNote(product);

  if (!unitNote) {
    return false;
  }

  if (product.category === 'לחמניות ובייגלים' || /\d+\s+יחידות/.test(product.product_name)) {
    return false;
  }

  return !(product.product_name.includes('1 ק״ג') && formatProductUnitNote(unitNote).includes('/ 1 ק״ג'));
}

function getVisibleProductUnitNote(product: ProductWithOptions) {
  return shouldShowProductUnitNote(product) ? formatProductUnitNote(getProductUnitNote(product)) : '';
}

function getSelectionGroups(selections: CartSelection[] = []) {
  return selections.reduce<Record<string, CartSelection[]>>((groups, selection) => {
    groups[selection.groupName] = [...(groups[selection.groupName] ?? []), selection];
    return groups;
  }, {});
}

function getSelectionTotal(selections: CartSelection[] = []) {
  return selections.reduce((sum, selection) => sum + selection.priceDelta, 0);
}

function getCartItemUnitPrice(item: CartItem) {
  return item.unitPriceIls ?? item.product.price_ils + getSelectionTotal(item.selections);
}

function formatOptionLabel(selection: CartSelection) {
  return `${selection.optionName}${selection.priceDelta > 0 ? ` (+${formatPrice(selection.priceDelta)})` : ''}`;
}

function makeCartItemId(product: ProductWithOptions, selections: CartSelection[] = []) {
  if (!selections.length) {
    return product.id;
  }

  const selectionKey = [...selections]
    .sort((a, b) => `${a.groupName}:${a.optionName}`.localeCompare(`${b.groupName}:${b.optionName}`, 'he'))
    .map((selection) => `${selection.groupName}:${selection.optionName}:${selection.priceDelta}`)
    .join('|');

  return `${product.id}::${selectionKey}`;
}

function hasProductOptions(product: ProductWithOptions) {
  return Boolean(product.option_groups?.some((group) => group.options.some((option) => option.active !== false)));
}

function buildOrderSummary({
  cartItems,
  fulfillment,
  selectedArea,
  customerName,
  phone,
  cityLabel,
  street,
  houseNumber,
  residenceType,
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
  houseNumber: string;
  residenceType: ResidenceType;
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
    const residenceLabel = residenceType === 'building' ? 'בניין' : residenceType === 'private-house' ? 'בית פרטי' : 'לא נבחר';
    lines.push(`סוג מגורים: ${residenceLabel}`);
    lines.push(`עיר: ${cityLabel || 'לא נבחרה'}`);
    lines.push(`רחוב: ${street || 'לא נמסר'}`);
    lines.push(`מספר בית: ${houseNumber || 'לא נמסר'}`);
    if (residenceType === 'building') {
      if (entrance.trim()) {
        lines.push(`כניסה: ${entrance.trim()}`);
      }
      lines.push(`קומה: ${floor}`);
      lines.push(`דירה: ${apartment}`);
    }
    if (selectedArea?.requiresConfirmation) {
      lines.push('אזור משלוח דורש בדיקה מול המאפייה');
    }
  }

  lines.push('', 'פריטים:');
  cartItems.forEach((item) => {
    const { product, quantity } = item;
    const unitNote = getVisibleProductUnitNote(product);
    const unitText = unitNote ? ` (${unitNote})` : '';
    lines.push(`- ${product.product_name} x${quantity} - ${formatPrice(getCartItemUnitPrice(item) * quantity)}${unitText}`);

    const selectionGroups = getSelectionGroups(item.selections);
    if (Object.keys(selectionGroups).length > 0) {
      lines.push('  בחירות:');
      Object.entries(selectionGroups).forEach(([groupName, selections]) => {
        lines.push(`  - ${groupName}: ${selections.map(formatOptionLabel).join(', ')}`);
      });
    }
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
  const [residenceType, setResidenceType] = useState<ResidenceType>('building');
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [notes, setNotes] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [checkoutErrors, setCheckoutErrors] = useState<CheckoutErrors>({});
  const [minimumPromptVisible, setMinimumPromptVisible] = useState(false);
  const [addToastVisible, setAddToastVisible] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState<ProductWithOptions | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [customizationError, setCustomizationError] = useState('');
  const checkoutStepRef = useRef<HTMLElement | null>(null);
  const categoryPickerRef = useRef<HTMLElement | null>(null);
  const categoryPickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const categoryPickerCloseRef = useRef<HTMLButtonElement | null>(null);

  const categories = useMemo(() => [allCategory, ...Array.from(new Set(products.map((product) => product.category)))], []);
  const visibleProducts = selectedCategory === allCategory
    ? products
    : products.filter((product) => product.category === selectedCategory);
  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountLabel = cartCount === 1 ? 'פריט אחד' : `${cartCount} פריטים`;
  const subtotal = cartItems.reduce((sum, item) => sum + getCartItemUnitPrice(item) * item.quantity, 0);
  const selectedArea = deliveryAreas.find((area) => area.id === cityId);
  const deliveryFee = fulfillment === 'delivery' ? selectedArea?.fee_ils ?? defaultDeliveryFeeIls : 0;
  const total = subtotal + deliveryFee;
  const deliveryMinimumNotMet =
    fulfillment === 'delivery' && cartItems.length > 0 && subtotal < minimumDeliverySubtotalIls;
  const deliveryMinimumMissing = Math.max(0, minimumDeliverySubtotalIls - subtotal);
  const deliveryAddressReady =
    fulfillment === 'pickup' ||
    (cityId.trim().length > 0 &&
      street.trim().length > 1 &&
      houseNumber.trim().length > 0 &&
      residenceType.length > 0 &&
      (residenceType === 'private-house' || (floor.trim().length > 0 && apartment.trim().length > 0)));
  const orderSummary = buildOrderSummary({
    cartItems,
    fulfillment,
    selectedArea,
    customerName,
    phone,
    cityLabel: selectedArea?.label ?? '',
    street,
    houseNumber,
    residenceType,
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
    isValidIsraeliPhone(phone) &&
    deliveryAddressReady &&
    notes.trim().length > 0 &&
    !deliveryMinimumNotMet;
  const canAttemptContinue = cartItems.length > 0;
  const whatsappHref = `https://wa.me/${bakeryWhatsappNumber}?text=${encodeURIComponent(orderSummary)}`;
  useEffect(() => {
    if (!addToastVisible) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setAddToastVisible(false), 1400);

    return () => window.clearTimeout(timeout);
  }, [addToastVisible]);

  useEffect(() => {
    if (!categoryPickerOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const categoryPickerTrigger = categoryPickerTriggerRef.current;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => categoryPickerCloseRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCategoryPickerOpen(false);
        return;
      }

      if (event.key === 'Tab') {
        const focusable = categoryPickerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
        if (!focusable?.length) {
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      categoryPickerTrigger?.focus();
    };
  }, [categoryPickerOpen]);

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
      document.querySelector('#shop-minimum-hint')?.scrollIntoView({
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
              setResidenceType((current) => current || 'building');
              setMinimumPromptVisible(false);
              setCheckoutErrors((current) => ({ ...current, order: undefined }));
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
              setCityId('');
              setStreet('');
              setHouseNumber('');
              setEntrance('');
              setFloor('');
              setApartment('');
              setMinimumPromptVisible(false);
              setCheckoutErrors((current) => ({
                ...current,
                cityId: undefined,
                street: undefined,
                houseNumber: undefined,
                residenceType: undefined,
                floor: undefined,
                apartment: undefined,
                order: undefined,
              }));
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
    setCheckoutErrors({});
    setMinimumPromptVisible(false);
  };

  const goToCatalog = () => {
    setOrderStep('catalog');
    setCartOpen(false);
    setCopyStatus('');
    setCheckoutErrors({});
    scrollShopTop();
  };

  const openCartPanel = () => {
    setAddToastVisible(false);
    setCartOpen(true);
  };

  const getActiveOptionGroups = (product: ProductWithOptions | null): ProductOptionGroup[] => (
    product?.option_groups
      ?.map((group) => ({
        ...group,
        options: group.options.filter((option) => option.active !== false),
      }))
      .filter((group) => group.options.length > 0) ?? []
  );

  const getSelectedProductOptions = (product: ProductWithOptions, selected: Record<string, string[]>) => (
    getActiveOptionGroups(product).flatMap((group) => {
      const selectedNames = selected[group.name] ?? [];
      return selectedNames
        .map((optionName) => group.options.find((option) => option.name === optionName))
        .filter((option): option is ProductOption => Boolean(option))
        .map((option) => ({
          groupName: group.name,
          optionName: option.name,
          priceDelta: option.price_delta ?? 0,
        }));
    })
  );

  const openProductOptions = (product: ProductWithOptions) => {
    setSelectedOptions({});
    setCustomizationError('');
    setCustomizingProduct(product);
    setAddToastVisible(false);
  };

  const closeProductOptions = () => {
    setCustomizingProduct(null);
    setSelectedOptions({});
    setCustomizationError('');
  };

  const toggleProductOption = (group: ProductOptionGroup, optionName: string) => {
    setCustomizationError('');
    setSelectedOptions((current) => {
      const currentGroupOptions = current[group.name] ?? [];
      const isSelected = currentGroupOptions.includes(optionName);
      const maxSelections = group.max ?? null;

      if (isSelected) {
        return {
          ...current,
          [group.name]: currentGroupOptions.filter((name) => name !== optionName),
        };
      }

      if (maxSelections === 1) {
        return {
          ...current,
          [group.name]: [optionName],
        };
      }

      if (maxSelections && currentGroupOptions.length >= maxSelections) {
        setCustomizationError(`אפשר לבחור עד ${maxSelections} אפשרויות ב${group.name}`);
        return current;
      }

      return {
        ...current,
        [group.name]: [...currentGroupOptions, optionName],
      };
    });
  };

  const addConfiguredProductToCart = () => {
    if (!customizingProduct) {
      return;
    }

    const optionGroups = getActiveOptionGroups(customizingProduct);
    const invalidGroup = optionGroups.find((group) => {
      const selectedCount = selectedOptions[group.name]?.length ?? 0;
      const minSelections = group.min ?? (group.required ? 1 : 0);
      const maxSelections = group.max ?? null;

      return selectedCount < minSelections || Boolean(maxSelections && selectedCount > maxSelections);
    });

    if (invalidGroup) {
      const selectedCount = selectedOptions[invalidGroup.name]?.length ?? 0;
      const minSelections = invalidGroup.min ?? (invalidGroup.required ? 1 : 0);
      const maxSelections = invalidGroup.max ?? null;

      if (selectedCount < minSelections) {
        setCustomizationError(`בחרו לפחות ${minSelections} אפשרויות ב${invalidGroup.name}`);
      } else if (maxSelections) {
        setCustomizationError(`אפשר לבחור עד ${maxSelections} אפשרויות ב${invalidGroup.name}`);
      }
      return;
    }

    const selections = getSelectedProductOptions(customizingProduct, selectedOptions);
    const itemId = makeCartItemId(customizingProduct, selections);
    const unitPriceIls = customizingProduct.price_ils + getSelectionTotal(selections);

    setMinimumPromptVisible(false);
    setCart((current) => ({
      ...current,
      [itemId]: {
        id: itemId,
        product: customizingProduct,
        quantity: (current[itemId]?.quantity ?? 0) + 1,
        selections,
        unitPriceIls,
      },
    }));
    closeProductOptions();
    window.requestAnimationFrame(() => setAddToastVisible(true));
  };

  const addToCart = (product: ProductWithOptions) => {
    setMinimumPromptVisible(false);
    setAddToastVisible(false);

    if (hasProductOptions(product)) {
      openProductOptions(product);
      return;
    }

    const itemId = makeCartItemId(product);
    setCart((current) => ({
      ...current,
      [itemId]: {
        id: itemId,
        product,
        quantity: (current[itemId]?.quantity ?? 0) + 1,
        selections: [],
        unitPriceIls: product.price_ils,
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

  const clearCheckoutError = (field: CheckoutField) => {
    setCheckoutErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const validateCheckout = () => {
    const nextErrors: CheckoutErrors = {};

    if (customerName.trim().length < 2) {
      nextErrors.customerName = 'כתבו שם מלא.';
    }

    if (!isValidIsraeliPhone(phone)) {
      nextErrors.phone = 'כתבו מספר טלפון ישראלי תקין.';
    }

    if (fulfillment === 'delivery') {
      if (!cityId) {
        nextErrors.cityId = 'בחרו עיר.';
      }
      if (street.trim().length < 2) {
        nextErrors.street = 'כתבו את שם הרחוב.';
      }
      if (!houseNumber.trim()) {
        nextErrors.houseNumber = 'כתבו מספר בית.';
      }
      if (!residenceType) {
        nextErrors.residenceType = 'בחרו בניין או בית פרטי.';
      }
      if (residenceType === 'building') {
        if (!floor.trim()) {
          nextErrors.floor = 'כתבו קומה.';
        }
        if (!apartment.trim()) {
          nextErrors.apartment = 'כתבו מספר דירה.';
        }
      }
      if (subtotal < minimumDeliverySubtotalIls) {
        nextErrors.order = `מינימום הזמנה למשלוח הוא ${minimumDeliverySubtotalText}.`;
      }
    }

    if (!notes.trim()) {
      nextErrors.notes = 'כתבו הערות להזמנה.';
    }

    if (!cartItems.length) {
      nextErrors.order = 'ההזמנה שלך ריקה.';
    }

    setCheckoutErrors(nextErrors);

    const fieldOrder: CheckoutField[] = [
      'customerName',
      'phone',
      'cityId',
      'street',
      'houseNumber',
      'residenceType',
      'floor',
      'apartment',
      'notes',
      'order',
    ];
    const firstInvalidField = fieldOrder.find((field) => nextErrors[field]);
    if (firstInvalidField) {
      window.requestAnimationFrame(() => {
        const target = document.getElementById(`checkout-${firstInvalidField}`);
        target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        target?.focus({ preventScroll: true });
      });
    }

    return !firstInvalidField;
  };

  const submitOrderToWhatsapp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateCheckout()) {
      return;
    }

    window.open(whatsappHref, '_blank', 'noopener,noreferrer');
  };

  const renderCheckoutError = (field: CheckoutField) => (
    checkoutErrors[field] ? (
      <span className="shop-field-error" id={`checkout-${field}-error`} role="alert">
        {checkoutErrors[field]}
      </span>
    ) : null
  );

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
          <h1 className="shop-sr-only">הזמנה אונליין ממאפיית יחד</h1>
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

            <div className="shop-category-nav">
              <div className="shop-category-tabs" aria-label="סינון קטגוריות">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={selectedCategory === category ? 'is-active' : undefined}
                    type="button"
                    aria-pressed={selectedCategory === category}
                    onClick={() => setSelectedCategory(category)}
                  >
                    <span>{category}</span>
                  </button>
                ))}
              </div>
              <button
                className="shop-category-picker-trigger"
                ref={categoryPickerTriggerRef}
                type="button"
                aria-expanded={categoryPickerOpen}
                aria-controls="shop-category-picker"
                onClick={() => setCategoryPickerOpen(true)}
              >
                כל הקטגוריות
              </button>
            </div>

            <div className="shop-grid">
              {visibleProducts.map((product, index) => {
                const itemId = makeCartItemId(product);
                const cartItem = cart[itemId];
                const productHasOptions = hasProductOptions(product);
                const displayPrice = getProductDisplayPrice(product);

                return (
                  <article className="shop-product-card" key={product.id}>
                    <div className={`shop-product-media ${product.image_url ? 'has-product-image' : 'is-missing-image'}`}>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.product_name}
                          loading={index > 5 ? 'lazy' : 'eager'}
                          fetchPriority={index < 4 ? 'high' : 'auto'}
                          decoding="async"
                        />
                      ) : (
                        <div className="shop-product-placeholder" aria-label={`אין עדיין תמונה עבור ${product.product_name}`}>
                          <ImageSquare size={30} weight="light" aria-hidden="true" />
                          <span>תמונה תתווסף בקרוב</span>
                        </div>
                      )}
                    </div>
                    <div className="shop-product-body">
                      <div className="shop-product-copy">
                        <h3>{product.product_name}</h3>
                        {product.description ? <p>{product.description}</p> : null}
                      </div>
                      <div className="shop-product-foot">
                        <div className="shop-price-stack">
                          <strong dir="ltr" aria-label={displayPrice}>
                            <span className="shop-price-currency" aria-hidden="true">₪</span>
                            <bdi className="shop-price-amount" dir="ltr">{displayPrice.replace('₪', '').trim()}</bdi>
                          </strong>
                          {getVisibleProductUnitNote(product) && <span><bdi>{getVisibleProductUnitNote(product)}</bdi></span>}
                        </div>
                        {cartItem && !productHasOptions ? (
                          <div className="shop-card-quantity" aria-label={`כמות ${product.product_name}`}>
                            <button
                              type="button"
                              aria-label={`הפחתת ${product.product_name}`}
                              onClick={() => updateQuantity(itemId, cartItem.quantity - 1)}
                            >
                              <Minus size={16} weight="bold" />
                            </button>
                            <span aria-live="polite">{cartItem.quantity}</span>
                            <button
                              type="button"
                              aria-label={`הוספת ${product.product_name}`}
                              onClick={() => updateQuantity(itemId, cartItem.quantity + 1)}
                            >
                              <Plus size={16} weight="bold" />
                            </button>
                          </div>
                        ) : (
                          <button className="shop-add-button" type="button" onClick={() => addToCart(product)}>
                            <Plus size={18} weight="bold" />
                            הוספה
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="shop-checkout-step" ref={checkoutStepRef} aria-labelledby="checkout-title">
            <div className="shop-checkout-card">
              <div className="shop-checkout-title">
                <h1 id="checkout-title">פרטי ההזמנה</h1>
              </div>

              <div className="shop-checkout-overview" aria-label="סיכום ההזמנה">
                <div className="shop-checkout-overview-head">
                  <span>סיכום ההזמנה</span>
                  <strong><bdi>{formatPrice(total)}</bdi></strong>
                </div>
                <div className="shop-checkout-overview-meta">
                  <span>{cartCountLabel}</span>
                  <span>סכום ביניים <bdi>{formatPrice(subtotal)}</bdi></span>
                  <span>{fulfillment === 'delivery' ? `משלוח ${formatPrice(deliveryFee)}` : 'איסוף עצמי'}</span>
                </div>
              </div>

              <form
                className="shop-checkout-form shop-checkout-form--page"
                id="shop-checkout-form"
                noValidate
                onSubmit={submitOrderToWhatsapp}
              >
                <div className="shop-form-panel shop-form-panel--fulfillment">
                  <div className="shop-form-title">אופן קבלה</div>
                  {renderFulfillmentSelector('form')}
                </div>

                <div className="shop-form-panel">
                  <div className="shop-form-title">פרטי קשר</div>
                  <div className="shop-form-grid shop-form-grid--customer">
                    <label htmlFor="checkout-customerName">
                      <span className="shop-field-label">שם מלא <span aria-hidden="true">*</span></span>
                      <input
                        id="checkout-customerName"
                        name="customerName"
                        value={customerName}
                        onChange={(event) => {
                          setCustomerName(event.target.value);
                          clearCheckoutError('customerName');
                        }}
                        placeholder="שם המזמין/ה"
                        autoComplete="name"
                        aria-invalid={Boolean(checkoutErrors.customerName)}
                        aria-describedby={checkoutErrors.customerName ? 'checkout-customerName-error' : undefined}
                        aria-required="true"
                        required
                      />
                      {renderCheckoutError('customerName')}
                    </label>
                    <label htmlFor="checkout-phone">
                      <span className="shop-field-label">טלפון <span aria-hidden="true">*</span></span>
                      <input
                        id="checkout-phone"
                        name="phone"
                        type="tel"
                        value={phone}
                        onChange={(event) => {
                          setPhone(event.target.value);
                          clearCheckoutError('phone');
                        }}
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder="050-0000000"
                        aria-invalid={Boolean(checkoutErrors.phone)}
                        aria-describedby={checkoutErrors.phone ? 'checkout-phone-error' : undefined}
                        aria-required="true"
                        required
                      />
                      {renderCheckoutError('phone')}
                    </label>
                  </div>
                </div>

                {fulfillment === 'delivery' ? (
                  <div className="shop-form-panel shop-form-panel--address">
                    <div className="shop-form-title">כתובת למשלוח</div>
                    <div className="shop-form-grid shop-form-grid--address-main">
                        <label htmlFor="checkout-cityId">
                          <span className="shop-field-label">עיר <span aria-hidden="true">*</span></span>
                          <select
                            id="checkout-cityId"
                            name="city"
                            value={cityId}
                            onChange={(event) => {
                              setCityId(event.target.value);
                              setStreet('');
                              clearCheckoutError('cityId');
                              clearCheckoutError('street');
                            }}
                            autoComplete="address-level2"
                            aria-invalid={Boolean(checkoutErrors.cityId)}
                            aria-describedby={checkoutErrors.cityId ? 'checkout-cityId-error' : undefined}
                            aria-required="true"
                            required
                          >
                            <option value="">בחרו עיר</option>
                            {deliveryAreas.map((area) => (
                              <option key={area.id} value={area.id}>
                                {area.label}
                              </option>
                            ))}
                          </select>
                          {renderCheckoutError('cityId')}
                        </label>
                        <label htmlFor="checkout-street">
                          <span className="shop-field-label">רחוב <span aria-hidden="true">*</span></span>
                          <input
                            id="checkout-street"
                            name="street"
                            value={street}
                            onChange={(event) => {
                              setStreet(event.target.value);
                              clearCheckoutError('street');
                            }}
                            placeholder="שם הרחוב"
                            autoComplete="address-line1"
                            disabled={!cityId}
                            aria-invalid={Boolean(checkoutErrors.street)}
                            aria-describedby={checkoutErrors.street ? 'checkout-street-error' : undefined}
                            aria-required="true"
                            required
                          />
                          {renderCheckoutError('street')}
                        </label>
                    </div>
                    {selectedArea?.requiresConfirmation && (
                      <p className="shop-warning">אזור זה ייבדק מול המאפייה לפני אישור משלוח.</p>
                    )}

                    <fieldset className="shop-residence-field">
                      <legend className="shop-field-label">סוג מגורים <span aria-hidden="true">*</span></legend>
                      <div className="shop-choice-row" role="radiogroup" aria-describedby={checkoutErrors.residenceType ? 'checkout-residenceType-error' : undefined}>
                        <label className={residenceType === 'building' ? 'is-selected' : undefined}>
                          <input
                            id="checkout-residenceType"
                            checked={residenceType === 'building'}
                            name="residenceType"
                            type="radio"
                            value="building"
                            onChange={() => {
                              setResidenceType('building');
                              clearCheckoutError('residenceType');
                            }}
                            aria-invalid={Boolean(checkoutErrors.residenceType)}
                            aria-required="true"
                            required
                          />
                          בניין
                        </label>
                        <label className={residenceType === 'private-house' ? 'is-selected' : undefined}>
                          <input
                            id="checkout-residenceType-private"
                            checked={residenceType === 'private-house'}
                            name="residenceType"
                            type="radio"
                            value="private-house"
                            onChange={() => {
                              setResidenceType('private-house');
                              setEntrance('');
                              setFloor('');
                              setApartment('');
                              setCheckoutErrors((current) => ({
                                ...current,
                                residenceType: undefined,
                                floor: undefined,
                                apartment: undefined,
                              }));
                            }}
                            aria-invalid={Boolean(checkoutErrors.residenceType)}
                            aria-required="true"
                            required
                          />
                          בית פרטי
                        </label>
                      </div>
                      {renderCheckoutError('residenceType')}
                    </fieldset>

                    <div className={`shop-address-grid ${residenceType === 'building' ? '' : 'is-private-house'}`}>
                      <label htmlFor="checkout-houseNumber">
                        <span className="shop-field-label">מספר בית <span aria-hidden="true">*</span></span>
                        <input
                          id="checkout-houseNumber"
                          name="houseNumber"
                          value={houseNumber}
                          onChange={(event) => {
                            setHouseNumber(event.target.value);
                            clearCheckoutError('houseNumber');
                          }}
                          inputMode="text"
                          autoComplete="address-line2"
                          placeholder="מספר"
                          aria-invalid={Boolean(checkoutErrors.houseNumber)}
                          aria-describedby={checkoutErrors.houseNumber ? 'checkout-houseNumber-error' : undefined}
                          aria-required="true"
                          required
                        />
                        {renderCheckoutError('houseNumber')}
                      </label>
                      {residenceType === 'building' && (
                        <>
                          <label htmlFor="checkout-entrance">
                            כניסה — לא חובה
                            <input id="checkout-entrance" name="entrance" value={entrance} onChange={(event) => setEntrance(event.target.value)} placeholder="א / ב" />
                          </label>
                          <label htmlFor="checkout-floor">
                            <span className="shop-field-label">קומה <span aria-hidden="true">*</span></span>
                            <input
                              id="checkout-floor"
                              name="floor"
                              value={floor}
                              onChange={(event) => {
                                setFloor(event.target.value);
                                clearCheckoutError('floor');
                              }}
                              inputMode="text"
                              placeholder="2 או קרקע"
                              aria-invalid={Boolean(checkoutErrors.floor)}
                              aria-describedby={checkoutErrors.floor ? 'checkout-floor-error' : undefined}
                              aria-required="true"
                              required={residenceType === 'building'}
                            />
                            {renderCheckoutError('floor')}
                          </label>
                          <label htmlFor="checkout-apartment">
                            <span className="shop-field-label">דירה <span aria-hidden="true">*</span></span>
                            <input
                              id="checkout-apartment"
                              name="apartment"
                              value={apartment}
                              onChange={(event) => {
                                setApartment(event.target.value);
                                clearCheckoutError('apartment');
                              }}
                              inputMode="numeric"
                              placeholder="מספר דירה"
                              aria-invalid={Boolean(checkoutErrors.apartment)}
                              aria-describedby={checkoutErrors.apartment ? 'checkout-apartment-error' : undefined}
                              aria-required="true"
                              required={residenceType === 'building'}
                            />
                            {renderCheckoutError('apartment')}
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="shop-form-panel">
                  <label htmlFor="checkout-notes">
                    <span className="shop-field-label">הערות להזמנה <span aria-hidden="true">*</span></span>
                    <textarea
                      id="checkout-notes"
                      name="notes"
                      value={notes}
                      onChange={(event) => {
                        setNotes(event.target.value);
                        clearCheckoutError('notes');
                      }}
                      placeholder="קוד בלובי, להשאיר מחוץ לדלת, להתקשר כשמגיעים"
                      aria-invalid={Boolean(checkoutErrors.notes)}
                      aria-describedby={checkoutErrors.notes ? 'checkout-notes-error' : undefined}
                      aria-required="true"
                      required
                      rows={3}
                    />
                    {renderCheckoutError('notes')}
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

          <div className="shop-cart-scroll">
            {cartItems.length ? (
              <div className="shop-cart-items">
                {cartItems.map((item) => {
                  const { id, product, quantity } = item;
                  const selectionGroups = getSelectionGroups(item.selections);
                  const unitPrice = getCartItemUnitPrice(item);
                  const unitNote = getVisibleProductUnitNote(product);
                  const itemMeta = [quantity > 1 ? `${formatPrice(unitPrice)} ליח׳` : '', unitNote]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <div className="shop-cart-item" key={id}>
                      <div className="shop-cart-item-content">
                        <div className="shop-cart-item-top">
                          <strong className="shop-cart-item-name">{product.product_name}</strong>
                          <strong className="shop-cart-line-total"><bdi>{formatPrice(unitPrice * quantity)}</bdi></strong>
                        </div>
                        {itemMeta && <span className="shop-cart-item-meta"><bdi>{itemMeta}</bdi></span>}
                        {Object.keys(selectionGroups).length > 0 && (
                          <div className="shop-cart-options" aria-label="בחירות למוצר">
                            {Object.entries(selectionGroups).map(([groupName, selections]) => (
                              <p key={groupName}>
                                <b>{groupName}:</b> {selections.map(formatOptionLabel).join(', ')}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="shop-cart-item-actions">
                        <div className="shop-quantity" aria-label={`כמות ${product.product_name}`}>
                          <button type="button" onClick={() => updateQuantity(id, quantity - 1)} aria-label={`הפחתת ${product.product_name}`}>
                            <Minus size={16} weight="bold" />
                          </button>
                          <span aria-live="polite">{quantity}</span>
                          <button type="button" onClick={() => updateQuantity(id, quantity + 1)} aria-label={`הוספת ${product.product_name}`}>
                            <Plus size={16} weight="bold" />
                          </button>
                        </div>
                        <button
                          className="shop-remove-item"
                          type="button"
                          onClick={() => updateQuantity(id, 0)}
                          aria-label={`הסרת ${product.product_name}`}
                        >
                          הסרה
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="shop-empty-cart">
                <strong>ההזמנה שלך ריקה</strong>
              </div>
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="shop-cart-summary">
              {orderStep === 'catalog' && renderFulfillmentSelector('summary')}

              <div className="shop-totals" aria-live="polite">
                <div className="shop-totals-row">
                  <span>סכום ביניים</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>
                <div className="shop-totals-row">
                  <span>דמי משלוח</span>
                  <strong>{formatPrice(deliveryFee)}</strong>
                </div>
                {deliveryMinimumNotMet && (
                  <p
                    className={`shop-minimum-note ${minimumPromptVisible ? 'is-emphasized' : ''}`}
                    id="shop-minimum-hint"
                    role="status"
                    aria-live="polite"
                  >
                    <strong>מינימום הזמנה למשלוח הוא {minimumDeliverySubtotalText}</strong>
                    <span>חסרים עוד {formatPrice(deliveryMinimumMissing)} כדי להמשיך</span>
                  </p>
                )}
                <div className="shop-total-line">
                  <span>סה״כ הזמנה</span>
                  <strong>{formatPrice(total)}</strong>
                </div>
              </div>

              {orderStep === 'catalog' ? (
                <div className="shop-summary-actions">
                  <button
                    className={`shop-continue-button ${deliveryMinimumNotMet ? 'is-blocked-by-minimum' : ''}`}
                    type="button"
                    onClick={goToOrderDetails}
                    aria-disabled={deliveryMinimumNotMet}
                    aria-describedby={deliveryMinimumNotMet ? 'shop-minimum-hint' : undefined}
                  >
                    המשך לפרטי הזמנה
                  </button>
                </div>
              ) : (
                <div className="shop-actions">
                  <button
                    className="shop-whatsapp-button"
                    type="button"
                    onClick={() => {
                      const checkoutForm = document.getElementById('shop-checkout-form');
                      if (checkoutForm instanceof HTMLFormElement) {
                        checkoutForm.requestSubmit();
                      }
                    }}
                    aria-describedby={checkoutErrors.order ? 'checkout-order' : 'checkout-whatsapp-helper'}
                  >
                    <WhatsappLogo size={21} weight="bold" />
                    שליחת ההזמנה בוואטסאפ
                  </button>
                  <p className="shop-whatsapp-helper" id="checkout-whatsapp-helper">
                    ההזמנה תישלח למאפייה לאישור.
                  </p>
                  {checkoutErrors.order && (
                    <p className="shop-field-error shop-order-error" id="checkout-order" role="alert" tabIndex={-1}>
                      {checkoutErrors.order}
                    </p>
                  )}
                  <button className="shop-copy-button" type="button" onClick={copyOrderSummary} disabled={!canSendOrder}>
                    <Copy size={18} weight="bold" />
                    העתקת הזמנה
                  </button>
                  {copyStatus && <span className="shop-copy-status">{copyStatus}</span>}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {cartCount > 0 && orderStep === 'catalog' && (
        <button
          className="shop-mobile-cart-button"
          type="button"
          onClick={openCartPanel}
          aria-label={`ההזמנה שלי, ${cartCountLabel}, סך משוער ${formatPrice(total)}`}
        >
          <Basket size={21} weight="bold" />
          <span className="shop-mobile-cart-title">ההזמנה שלי</span>
          <span className="shop-mobile-cart-meta">{cartCountLabel} · <bdi>{formatPrice(total)}</bdi></span>
        </button>
      )}

      {addToastVisible && orderStep === 'catalog' && (
        <div className="shop-add-toast" role="status" aria-live="polite">
          נוסף להזמנה
        </div>
      )}

      {categoryPickerOpen && orderStep === 'catalog' && (
        <div
          className="shop-category-picker-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCategoryPickerOpen(false);
            }
          }}
        >
          <section
            className="shop-category-picker"
            ref={categoryPickerRef}
            id="shop-category-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-category-picker-title"
          >
            <div className="shop-category-picker-head">
              <h2 id="shop-category-picker-title">כל הקטגוריות</h2>
              <button ref={categoryPickerCloseRef} type="button" onClick={() => setCategoryPickerOpen(false)} aria-label="סגירת רשימת קטגוריות">
                <X size={20} weight="bold" />
              </button>
            </div>
            <div className="shop-category-picker-list">
              {categories.map((category) => (
                <button
                  key={category}
                  className={selectedCategory === category ? 'is-active' : undefined}
                  type="button"
                  aria-pressed={selectedCategory === category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setCategoryPickerOpen(false);
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {customizingProduct && (
        <div className="shop-option-backdrop" role="dialog" aria-modal="true" aria-labelledby="shop-option-title">
          <div className="shop-option-drawer">
            <div className="shop-option-head">
              <div>
                <span className="shop-kicker">התאמה אישית</span>
                <h2 id="shop-option-title">{customizingProduct.product_name}</h2>
                <p>מחיר בסיס: {formatPrice(customizingProduct.price_ils)}</p>
              </div>
              <button type="button" onClick={closeProductOptions} aria-label="סגירת התאמה">
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className="shop-option-groups">
              {getActiveOptionGroups(customizingProduct).map((group) => {
                const selectedInGroup = selectedOptions[group.name] ?? [];
                const minSelections = group.min ?? (group.required ? 1 : 0);
                const maxSelections = group.max ?? null;

                return (
                  <section className="shop-option-group" key={group.name}>
                    <div className="shop-option-group-title">
                      <h3>{group.name}</h3>
                      <span>
                        {minSelections > 0 ? `חובה לבחור לפחות ${minSelections}` : 'בחירה חופשית'}
                        {maxSelections ? ` · עד ${maxSelections}` : ''}
                      </span>
                    </div>
                    <div className="shop-option-choices">
                      {group.options.map((option) => {
                        const checked = selectedInGroup.includes(option.name);

                        return (
                          <label className={checked ? 'is-selected' : undefined} key={option.name}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleProductOption(group, option.name)}
                            />
                            <span>{option.name}</span>
                            {(option.price_delta ?? 0) > 0 && <bdi>+{formatPrice(option.price_delta ?? 0)}</bdi>}
                          </label>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            {customizationError && (
              <p className="shop-option-error" role="status" aria-live="polite">
                {customizationError}
              </p>
            )}

            <div className="shop-option-footer">
              <strong>
                סה״כ <bdi>{formatPrice(customizingProduct.price_ils + getSelectionTotal(getSelectedProductOptions(customizingProduct, selectedOptions)))}</bdi>
              </strong>
              <button type="button" onClick={addConfiguredProductToCart}>
                <Plus size={18} weight="bold" />
                הוספה להזמנה
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
