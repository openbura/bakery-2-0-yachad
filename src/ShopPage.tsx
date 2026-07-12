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

import shopCoverImage from './assets/bakery-2/shop-cover-yachad.jpg';
import { usePublicShop } from './hooks/usePublicShop';
import { reconcileCart } from './shop/cartReconciliation';
import type {
  CartSelection,
  ShopCartItem,
  ShopProduct,
  ShopProductOption,
  ShopProductOptionGroup,
  ShopStoreSettings,
} from './shop/publicShopTypes';
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
  requiresConfirmation: boolean;
  notes: string;
};

const bakeryWhatsappNumber = '972502696267';
const ilsFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const allCategory = 'הכל';

// Demo business rules. Delivery prices can be adjusted later.
const deliveryAreas: DeliveryArea[] = [
  {
    id: 'kfar-saba',
    label: 'כפר סבא',
    requiresConfirmation: false,
    notes: 'כלל דמו: דמי משלוח קבועים; ניתן לעדכן בהמשך.',
  },
  {
    id: 'hod-hasharon',
    label: 'הוד השרון',
    requiresConfirmation: false,
    notes: 'כלל דמו: דמי משלוח קבועים; ניתן לעדכן בהמשך.',
  },
  {
    id: 'raanana',
    label: 'רעננה',
    requiresConfirmation: false,
    notes: 'כלל דמו: דמי משלוח קבועים; ניתן לעדכן בהמשך.',
  },
  {
    id: 'other',
    label: 'אחר / בדיקה מול המאפייה',
    requiresConfirmation: true,
    notes: 'אזור דורש בדיקה מול המאפייה; דמי המשלוח בדמו נשארים קבועים.',
  },
];

function formatPrice(valueAgorot: number) {
  return ilsFormatter.format(valueAgorot / 100);
}

function isValidIsraeliPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return /^0(?:5\d{8}|7\d{8}|[23489]\d{7})$/.test(digits);
}

function getProductDisplayPrice(product: ShopProduct) {
  return formatPrice(product.priceAgorot);
}

function getProductUnitNote(product: ShopProduct) {
  return product.priceUnitNote || '';
}

function formatProductUnitNote(note: string) {
  return note.replace(/₪(\d+)\.00\b/g, '₪$1').replace(/\s*\/\s*/g, ' / ').trim();
}

function shouldShowProductUnitNote(product: ShopProduct) {
  const unitNote = getProductUnitNote(product);

  if (!unitNote) {
    return false;
  }

  if (product.category === 'לחמניות ובייגלים' || /\d+\s+יחידות/.test(product.name)) {
    return false;
  }

  return !(product.name.includes('1 ק״ג') && formatProductUnitNote(unitNote).includes('/ 1 ק״ג'));
}

function getVisibleProductUnitNote(product: ShopProduct) {
  return shouldShowProductUnitNote(product) ? formatProductUnitNote(getProductUnitNote(product)) : '';
}

function getSelectionGroups(selections: CartSelection[] = []) {
  return selections.reduce<Record<string, CartSelection[]>>((groups, selection) => {
    groups[selection.groupName] = [...(groups[selection.groupName] ?? []), selection];
    return groups;
  }, {});
}

function getSelectionTotal(selections: CartSelection[] = []) {
  return selections.reduce((sum, selection) => sum + selection.priceDeltaAgorot, 0);
}

function getCartItemUnitPrice(item: ShopCartItem) {
  return item.unitPriceAgorot;
}

function formatOptionLabel(selection: CartSelection) {
  return `${selection.optionName}${selection.priceDeltaAgorot > 0 ? ` (+${formatPrice(selection.priceDeltaAgorot)})` : ''}`;
}

function makeCartItemId(product: ShopProduct, selections: CartSelection[] = []) {
  if (!selections.length) {
    return product.id;
  }

  const selectionKey = [...selections]
    .sort((a, b) => `${a.groupCode}:${a.optionCode}`.localeCompare(`${b.groupCode}:${b.optionCode}`))
    .map((selection) => `${selection.groupCode}:${selection.optionCode}`)
    .join('|');

  return `${product.id}::${selectionKey}`;
}

function hasProductOptions(product: ShopProduct) {
  return Boolean(product.optionGroups.some((group) => group.active && group.options.some((option) => option.active)));
}

function getOperationalBlock(settings: ShopStoreSettings, items: ShopCartItem[], fulfillment: FulfillmentType) {
  if (!settings.orderingEnabled) {
    return 'ההזמנות סגורות כרגע.';
  }
  if (fulfillment === 'delivery' && !settings.deliveryEnabled) {
    return 'אין משלוחים כרגע. אפשר לעבור לאיסוף עצמי.';
  }
  if (fulfillment === 'pickup' && !settings.pickupEnabled) {
    return 'איסוף עצמי אינו זמין כרגע. אפשר לעבור למשלוח.';
  }
  const invalidItem = items.find((item) => item.invalidReason);
  if (invalidItem) {
    return invalidItem.invalidReason ?? 'יש מוצר שדורש עדכון בעגלה.';
  }
  const incompatible = items.find((item) => (
    fulfillment === 'delivery' ? !item.product.availableForDelivery : !item.product.availableForPickup
  ));
  if (incompatible) {
    return `${incompatible.product.name} אינו זמין בשיטת הקבלה שנבחרה.`;
  }
  return '';
}

function isCustomerNoticeVisible(settings: ShopStoreSettings, now = Date.now()) {
  if (!settings.customerNoticeActive || !settings.customerNoticeText.trim()) {
    return false;
  }
  const startsAt = settings.customerNoticeStartAt ? Date.parse(settings.customerNoticeStartAt) : null;
  const endsAt = settings.customerNoticeEndAt ? Date.parse(settings.customerNoticeEndAt) : null;
  return (startsAt === null || startsAt <= now) && (endsAt === null || endsAt >= now);
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
  cartItems: ShopCartItem[];
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
    lines.push(`- ${product.name} x${quantity} - ${formatPrice(getCartItemUnitPrice(item) * quantity)}${unitText}`);

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
  const { snapshot, status: shopStatus, isRefreshing, refresh } = usePublicShop();
  const [selectedCategory, setSelectedCategory] = useState(allCategory);
  const [cart, setCart] = useState<Record<string, ShopCartItem>>({});
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
  const [operationalMessage, setOperationalMessage] = useState('');
  const [priceUpdateVisible, setPriceUpdateVisible] = useState(false);
  const [finalValidationPending, setFinalValidationPending] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState<ShopProduct | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [customizationError, setCustomizationError] = useState('');
  const checkoutStepRef = useRef<HTMLElement | null>(null);
  const categoryPickerRef = useRef<HTMLElement | null>(null);
  const categoryPickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const categoryPickerCloseRef = useRef<HTMLButtonElement | null>(null);

  const products = snapshot.products;
  const settings = snapshot.settings;
  const displayedCustomizingProduct = customizingProduct
    ? products.find((product) => product.id === customizingProduct.id) ?? customizingProduct
    : null;
  const isLive = shopStatus === 'live' && snapshot.live;
  const categories = useMemo(() => [allCategory, ...snapshot.categories.map((category) => category.name)], [snapshot.categories]);
  const visibleProducts = selectedCategory === allCategory
    ? products
    : products.filter((product) => product.category === selectedCategory);
  const cartReconciliation = useMemo(() => reconcileCart(cart, snapshot), [cart, snapshot]);
  const cartItems = Object.values(cartReconciliation.cart);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountLabel = cartCount === 1 ? 'פריט אחד' : `${cartCount} פריטים`;
  const subtotal = cartItems.reduce((sum, item) => sum + getCartItemUnitPrice(item) * item.quantity, 0);
  const selectedArea = deliveryAreas.find((area) => area.id === cityId);
  const deliveryFee = fulfillment === 'delivery' ? settings.deliveryFeeAgorot : settings.pickupFeeAgorot;
  const total = subtotal + deliveryFee;
  const deliveryMinimumNotMet =
    fulfillment === 'delivery' && cartItems.length > 0 && subtotal < settings.minimumDeliverySubtotalAgorot;
  const deliveryMinimumMissing = Math.max(0, settings.minimumDeliverySubtotalAgorot - subtotal);
  const minimumDeliverySubtotalText = formatPrice(settings.minimumDeliverySubtotalAgorot);
  const selectedFulfillmentEnabled = fulfillment === 'delivery' ? settings.deliveryEnabled : settings.pickupEnabled;
  const cartHasInvalidItems = cartItems.some((item) => Boolean(item.invalidReason));
  const cartHasFulfillmentConflict = cartItems.some((item) => (
    fulfillment === 'delivery' ? !item.product.availableForDelivery : !item.product.availableForPickup
  ));
  const orderingAllowed = isLive && settings.orderingEnabled && (settings.deliveryEnabled || settings.pickupEnabled);
  const isProductOrderable = (product: ShopProduct) => (
    orderingAllowed &&
    product.availableToday &&
    selectedFulfillmentEnabled &&
    (fulfillment === 'delivery' ? product.availableForDelivery : product.availableForPickup)
  );
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
    !deliveryMinimumNotMet &&
    orderingAllowed &&
    selectedFulfillmentEnabled &&
    !cartHasInvalidItems &&
    !cartHasFulfillmentConflict;
  const canAttemptContinue = cartItems.length > 0 && orderingAllowed && selectedFulfillmentEnabled && !cartHasInvalidItems && !cartHasFulfillmentConflict;

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
        <label className={`${fulfillment === 'delivery' ? 'is-selected' : ''} ${!settings.deliveryEnabled ? 'is-disabled' : ''}`}>
          <input
            checked={fulfillment === 'delivery'}
            disabled={!settings.deliveryEnabled || !isLive}
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
        <label className={`${fulfillment === 'pickup' ? 'is-selected' : ''} ${!settings.pickupEnabled ? 'is-disabled' : ''}`}>
          <input
            checked={fulfillment === 'pickup'}
            disabled={!settings.pickupEnabled || !isLive}
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
        {!isLive
          ? 'הזמנה מושבתת עד לחזרת המידע החי.'
          : fulfillment === 'delivery' && !settings.deliveryEnabled
            ? 'המשלוחים מושהים כרגע. ניתן לבחור איסוף עצמי.'
            : fulfillment === 'pickup' && !settings.pickupEnabled
              ? 'האיסוף העצמי מושהה כרגע. ניתן לבחור משלוח.'
              : fulfillment === 'delivery'
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

  const goToOrderDetails = async () => {
    if (deliveryMinimumNotMet) {
      setMinimumPromptVisible(true);
      setAddToastVisible(false);
      setCartOpen(true);
      return;
    }

    if (!canAttemptContinue) {
      setOperationalMessage(getOperationalBlock(settings, cartItems, fulfillment) || 'לא ניתן להמשיך כרגע.');
      return;
    }

    setFinalValidationPending(true);
    try {
      const freshSnapshot = await refresh();
      const reconciled = reconcileCart(cart, freshSnapshot);
      setCart(reconciled.cart);
      if (reconciled.priceChanged) {
        setPriceUpdateVisible(true);
        setOperationalMessage('המחירים בהזמנה עודכנו. בדקו את הסכום לפני שממשיכים.');
        return;
      }
      const block = getOperationalBlock(freshSnapshot.settings, Object.values(reconciled.cart), fulfillment);
      if (block) {
        setOperationalMessage(block);
        return;
      }
    } catch {
      setOperationalMessage('לא הצלחנו לאמת את פרטי ההזמנה מול המאפייה. נסו שוב.');
      return;
    } finally {
      setFinalValidationPending(false);
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

  const getActiveOptionGroups = (product: ShopProduct | null): ShopProductOptionGroup[] => (
    product?.optionGroups
      ?.map((group) => ({
        ...group,
        options: group.options.filter((option) => option.active),
      }))
      .filter((group) => group.options.length > 0) ?? []
  );

  const getSelectedProductOptions = (product: ShopProduct, selected: Record<string, string[]>) => (
    getActiveOptionGroups(product).flatMap((group) => {
      const selectedCodes = selected[group.code] ?? [];
      return selectedCodes
        .map((optionCode) => group.options.find((option) => option.code === optionCode))
        .filter((option): option is ShopProductOption => Boolean(option))
        .map((option) => ({
          groupId: group.id,
          groupCode: group.code,
          groupName: group.name,
          optionId: option.id,
          optionCode: option.code,
          optionName: option.name,
          priceDeltaAgorot: option.priceDeltaAgorot,
        }));
    })
  );

  const openProductOptions = (product: ShopProduct) => {
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

  const toggleProductOption = (group: ShopProductOptionGroup, optionCode: string) => {
    setCustomizationError('');
    setSelectedOptions((current) => {
      const currentGroupOptions = current[group.code] ?? [];
      const isSelected = currentGroupOptions.includes(optionCode);
      const maxSelections = group.maxSelect;

      if (isSelected) {
        return {
          ...current,
          [group.code]: currentGroupOptions.filter((code) => code !== optionCode),
        };
      }

      if (maxSelections === 1) {
        return {
          ...current,
          [group.code]: [optionCode],
        };
      }

      if (maxSelections && currentGroupOptions.length >= maxSelections) {
        setCustomizationError(`אפשר לבחור עד ${maxSelections} אפשרויות ב${group.name}`);
        return current;
      }

      return {
        ...current,
          [group.code]: [...currentGroupOptions, optionCode],
      };
    });
  };

  const addConfiguredProductToCart = () => {
    if (!customizingProduct) {
      return;
    }

    const currentProduct = products.find((product) => product.id === customizingProduct.id);
    if (!currentProduct || !isProductOrderable(currentProduct)) {
      setCustomizationError(!isLive ? 'החיבור החי אינו זמין כרגע.' : 'המוצר או שיטת הקבלה אינם זמינים כרגע.');
      return;
    }

    const optionGroups = getActiveOptionGroups(currentProduct);
    const invalidGroup = optionGroups.find((group) => {
      const selectedCount = selectedOptions[group.code]?.length ?? 0;
      const minSelections = group.minSelect;
      const maxSelections = group.maxSelect;

      return selectedCount < minSelections || Boolean(maxSelections && selectedCount > maxSelections);
    });

    if (invalidGroup) {
      const selectedCount = selectedOptions[invalidGroup.code]?.length ?? 0;
      const minSelections = invalidGroup.minSelect;
      const maxSelections = invalidGroup.maxSelect;

      if (selectedCount < minSelections) {
        setCustomizationError(`בחרו לפחות ${minSelections} אפשרויות ב${invalidGroup.name}`);
      } else if (maxSelections) {
        setCustomizationError(`אפשר לבחור עד ${maxSelections} אפשרויות ב${invalidGroup.name}`);
      }
      return;
    }

    const selections = getSelectedProductOptions(currentProduct, selectedOptions);
    const requestedSelectionCount = Object.values(selectedOptions).reduce((sum, groupSelections) => sum + groupSelections.length, 0);
    if (selections.length !== requestedSelectionCount) {
      setCustomizationError('אחת האפשרויות השתנתה. בדקו שוב את הבחירות.');
      return;
    }
    const itemId = makeCartItemId(currentProduct, selections);
    const unitPriceAgorot = currentProduct.priceAgorot + getSelectionTotal(selections);

    setMinimumPromptVisible(false);
    setCart((current) => ({
      ...current,
      [itemId]: {
        id: itemId,
        productId: currentProduct.id,
        product: currentProduct,
        quantity: (current[itemId]?.quantity ?? 0) + 1,
        selections,
        unitPriceAgorot,
      },
    }));
    closeProductOptions();
    window.requestAnimationFrame(() => setAddToastVisible(true));
  };

  const addToCart = (product: ShopProduct) => {
    setMinimumPromptVisible(false);
    setAddToastVisible(false);

    if (!orderingAllowed) {
      setOperationalMessage(isLive ? 'ההזמנות סגורות כרגע.' : 'המידע החי אינו זמין כרגע. ניתן לעיין בלבד.');
      return;
    }
    if (!product.availableToday) {
      setOperationalMessage('המוצר אזל להיום.');
      return;
    }
    if (!isProductOrderable(product)) {
      setOperationalMessage('שיטת הקבלה שנבחרה אינה זמינה עבור המוצר הזה.');
      return;
    }

    if (hasProductOptions(product)) {
      openProductOptions(product);
      return;
    }

    const itemId = makeCartItemId(product);
    setCart((current) => ({
      ...current,
      [itemId]: {
        id: itemId,
        productId: product.id,
        product,
        quantity: (current[itemId]?.quantity ?? 0) + 1,
        selections: [],
        unitPriceAgorot: product.priceAgorot,
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
      if (subtotal < settings.minimumDeliverySubtotalAgorot) {
        nextErrors.order = `מינימום הזמנה למשלוח הוא ${minimumDeliverySubtotalText}.`;
      }
    }

    if (!notes.trim()) {
      nextErrors.notes = 'כתבו הערות להזמנה.';
    }

    if (!cartItems.length) {
      nextErrors.order = 'ההזמנה שלך ריקה.';
    }

    const operationalBlock = getOperationalBlock(settings, cartItems, fulfillment);
    if (!isLive || operationalBlock) {
      nextErrors.order = operationalBlock || 'לא ניתן לאמת הזמנה ללא חיבור חי למאפייה.';
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

  const submitOrderToWhatsapp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateCheckout() || finalValidationPending) {
      return;
    }

    const reservedWindow = window.open('', '_blank');
    setFinalValidationPending(true);
    setOperationalMessage('מאמתים מחירים וזמינות מול המאפייה…');
    try {
      const freshSnapshot = await refresh();
      const reconciled = reconcileCart(cart, freshSnapshot);
      setCart(reconciled.cart);
      const freshItems = Object.values(reconciled.cart);
      const block = getOperationalBlock(freshSnapshot.settings, freshItems, fulfillment);
      if (block) {
        reservedWindow?.close();
        setCheckoutErrors((current) => ({ ...current, order: block }));
        setOperationalMessage(block);
        return;
      }

      const freshSubtotal = freshItems.reduce((sum, item) => sum + item.unitPriceAgorot * item.quantity, 0);
      if (fulfillment === 'delivery' && freshSubtotal < freshSnapshot.settings.minimumDeliverySubtotalAgorot) {
        const message = `מינימום הזמנה למשלוח הוא ${formatPrice(freshSnapshot.settings.minimumDeliverySubtotalAgorot)}.`;
        reservedWindow?.close();
        setCheckoutErrors((current) => ({ ...current, order: message }));
        setOperationalMessage(message);
        return;
      }

      if (reconciled.priceChanged || freshSnapshot.settings.deliveryFeeAgorot !== settings.deliveryFeeAgorot || freshSnapshot.settings.pickupFeeAgorot !== settings.pickupFeeAgorot) {
        reservedWindow?.close();
        setPriceUpdateVisible(true);
        setOperationalMessage('המחיר או דמי המשלוח עודכנו. בדקו את הסיכום ושלחו שוב.');
        return;
      }

      const freshFee = fulfillment === 'delivery' ? freshSnapshot.settings.deliveryFeeAgorot : freshSnapshot.settings.pickupFeeAgorot;
      const freshSummary = buildOrderSummary({
        cartItems: freshItems,
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
        subtotal: freshSubtotal,
        deliveryFee: freshFee,
        total: freshSubtotal + freshFee,
      });
      const url = `https://wa.me/${bakeryWhatsappNumber}?text=${encodeURIComponent(freshSummary)}`;
      setOperationalMessage('ההזמנה אומתה. עוברים לוואטסאפ…');
      if (reservedWindow) {
        reservedWindow.opener = null;
        reservedWindow.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      reservedWindow?.close();
      const message = 'לא הצלחנו לבצע אימות חי. ההזמנה לא נשלחה — נסו שוב.';
      setCheckoutErrors((current) => ({ ...current, order: message }));
      setOperationalMessage(message);
    } finally {
      setFinalValidationPending(false);
    }
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

      <div className="shop-live-status" aria-live="polite">
        {shopStatus === 'loading' && (
          <div className="shop-status-banner is-loading" data-testid="shop-loading">
            טוענים את התפריט העדכני…
          </div>
        )}
        {shopStatus === 'degraded' && (
          <div className="shop-status-banner is-warning" data-testid="shop-degraded">
            <div>
              <strong>המידע החי אינו זמין כרגע</strong>
              <span>אפשר לעיין בתפריט, אבל לא ניתן לבצע הזמנה עד שהחיבור יחזור.</span>
            </div>
            <button type="button" onClick={() => void refresh().catch(() => undefined)} disabled={isRefreshing}>
              {isRefreshing ? 'מנסים שוב…' : 'ניסיון חוזר'}
            </button>
          </div>
        )}
        {isLive && !settings.orderingEnabled && (
          <div className="shop-status-banner is-closed" data-testid="ordering-closed">
            <strong>ההזמנות סגורות כרגע</strong>
            <span>התפריט נשאר פתוח לעיון.</span>
          </div>
        )}
        {isLive && settings.orderingEnabled && (!settings.deliveryEnabled || !settings.pickupEnabled) && (
          <div className="shop-status-banner is-warning" data-testid="fulfillment-status">
            {!settings.deliveryEnabled && settings.pickupEnabled && 'החנות כרגע בעומס — אין משלוחים כרגע. ניתן לבצע איסוף עצמי.'}
            {settings.deliveryEnabled && !settings.pickupEnabled && 'איסוף עצמי אינו זמין כרגע. ניתן לבצע משלוח.'}
            {!settings.deliveryEnabled && !settings.pickupEnabled && 'משלוחים ואיסוף עצמי מושהים כרגע. ניתן לעיין בתפריט בלבד.'}
          </div>
        )}
        {isCustomerNoticeVisible(settings) && (
          <div className={`shop-status-banner is-notice-${settings.customerNoticeType}`} data-testid="customer-notice">
            {settings.customerNoticeText}
          </div>
        )}
        {(priceUpdateVisible || cartReconciliation.priceChanged) && (
          <div className="shop-status-banner is-info" data-testid="price-updated">
            המחירים בהזמנה עודכנו לפי התפריט החי.
          </div>
        )}
        {operationalMessage && (
          <div className="shop-status-banner is-info" data-testid="operational-message">
            {operationalMessage}
          </div>
        )}
      </div>

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
                  <article className={`shop-product-card ${!product.availableToday ? 'is-unavailable' : ''}`} key={product.id} data-product-id={product.id}>
                    <div className={`shop-product-media ${product.imageUrl ? 'has-product-image' : 'is-missing-image'}`}>
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          loading={index > 5 ? 'lazy' : 'eager'}
                          fetchPriority={index < 4 ? 'high' : 'auto'}
                          decoding="async"
                        />
                      ) : (
                        <div className="shop-product-placeholder" aria-label={`אין עדיין תמונה עבור ${product.name}`}>
                          <ImageSquare size={30} weight="light" aria-hidden="true" />
                          <span>תמונה תתווסף בקרוב</span>
                        </div>
                      )}
                    </div>
                    <div className="shop-product-body">
                      <div className="shop-product-copy">
                        <div className="shop-product-heading">
                          <h3>{product.name}</h3>
                          {!product.availableToday && <span className="shop-stock-badge">אזל להיום</span>}
                        </div>
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
                          <div className="shop-card-quantity" aria-label={`כמות ${product.name}`}>
                            <button
                              type="button"
                              aria-label={`הפחתת ${product.name}`}
                              onClick={() => updateQuantity(itemId, cartItem.quantity - 1)}
                            >
                              <Minus size={16} weight="bold" />
                            </button>
                            <span aria-live="polite">{cartItem.quantity}</span>
                            <button
                              type="button"
                              aria-label={`הוספת ${product.name}`}
                              onClick={() => updateQuantity(itemId, cartItem.quantity + 1)}
                              disabled={!isProductOrderable(product)}
                            >
                              <Plus size={16} weight="bold" />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="shop-add-button"
                            type="button"
                            onClick={() => addToCart(product)}
                            disabled={!isProductOrderable(product)}
                          >
                            <Plus size={18} weight="bold" />
                            {!product.availableToday ? 'אזל להיום' : 'הוספה'}
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
                          <strong className="shop-cart-item-name">{product.name}</strong>
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
                        {item.invalidReason && (
                          <p className="shop-cart-item-warning" role="alert">{item.invalidReason}</p>
                        )}
                      </div>
                      <div className="shop-cart-item-actions">
                        <div className="shop-quantity" aria-label={`כמות ${product.name}`}>
                          <button type="button" onClick={() => updateQuantity(id, quantity - 1)} aria-label={`הפחתת ${product.name}`}>
                            <Minus size={16} weight="bold" />
                          </button>
                          <span aria-live="polite">{quantity}</span>
                          <button type="button" onClick={() => updateQuantity(id, quantity + 1)} aria-label={`הוספת ${product.name}`} disabled={Boolean(item.invalidReason) || !isProductOrderable(product)}>
                            <Plus size={16} weight="bold" />
                          </button>
                        </div>
                        <button
                          className="shop-remove-item"
                          type="button"
                          onClick={() => updateQuantity(id, 0)}
                          aria-label={`הסרת ${product.name}`}
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
                    onClick={() => void goToOrderDetails()}
                    disabled={finalValidationPending || !canAttemptContinue}
                    aria-disabled={deliveryMinimumNotMet || !canAttemptContinue}
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
                    disabled={finalValidationPending || !canSendOrder}
                  >
                    <WhatsappLogo size={21} weight="bold" />
                    {finalValidationPending ? 'מאמתים את ההזמנה…' : 'שליחת ההזמנה בוואטסאפ'}
                  </button>
                  <p className="shop-whatsapp-helper" id="checkout-whatsapp-helper">
                    ההזמנה תישלח למאפייה לאישור.
                  </p>
                  {checkoutErrors.order && (
                    <p className="shop-field-error shop-order-error" id="checkout-order" role="alert" tabIndex={-1}>
                      {checkoutErrors.order}
                    </p>
                  )}
                  <button className="shop-copy-button" type="button" onClick={copyOrderSummary} disabled={!canSendOrder || finalValidationPending}>
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

      {displayedCustomizingProduct && (
        <div className="shop-option-backdrop" role="dialog" aria-modal="true" aria-labelledby="shop-option-title">
          <div className="shop-option-drawer">
            <div className="shop-option-head">
              <div>
                <span className="shop-kicker">התאמה אישית</span>
                <h2 id="shop-option-title">{displayedCustomizingProduct.name}</h2>
                <p>מחיר בסיס: {formatPrice(displayedCustomizingProduct.priceAgorot)}</p>
              </div>
              <button type="button" onClick={closeProductOptions} aria-label="סגירת התאמה">
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className="shop-option-groups">
              {getActiveOptionGroups(displayedCustomizingProduct).map((group) => {
                const selectedInGroup = selectedOptions[group.code] ?? [];
                const minSelections = group.minSelect;
                const maxSelections = group.maxSelect;

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
                        const checked = selectedInGroup.includes(option.code);

                        return (
                          <label className={checked ? 'is-selected' : undefined} key={option.name}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleProductOption(group, option.code)}
                            />
                            <span>{option.name}</span>
                            {option.priceDeltaAgorot > 0 && <bdi>+{formatPrice(option.priceDeltaAgorot)}</bdi>}
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
                סה״כ <bdi>{formatPrice(displayedCustomizingProduct.priceAgorot + getSelectionTotal(getSelectedProductOptions(displayedCustomizingProduct, selectedOptions)))}</bdi>
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
