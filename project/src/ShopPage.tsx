import { activateModal } from '../admin-dashboard/src/accessibility/modal';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Basket,
  Copy,
  Minus,
  Plus,
  Storefront,
  Truck,
  CheckCircle,
  X,
} from '@phosphor-icons/react';

import { formatPrice, saleUnit, unitPrice, priceProductSelections, lineTotal, orderTotals } from '../admin-dashboard/src/domain/pricing';
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
import { readCheckoutSession, writeCheckoutSession, readCheckoutDraft, writeCheckoutDraft } from './shop/checkoutSession';
import type { FulfillmentType } from './shop/checkoutSession';
import { normalizeIsraeliPhone } from './shop/phone';
import { needsBusinessChoices } from './shop/productPolicy';
import { bakeryInfo } from './businessInfo';
import ProductImage from './components/ProductImage';
import { LegalLinks } from './LegalPage';
import { createOrder, fetchPickupSlots, fetchTrackedOrder, OrderSubmissionError } from './services/ordersRepository';
import { clearOrderIntent, persistOrderIntent, readOrderIntent, readOrderReceipt, rememberOrderReceipt } from './shop/orderSubmission';
import { emptyCheckoutDraft } from './shop/checkoutSession';
import type { CreateOrderInput, CreatedOrder, PickupSlot } from './shop/orderTypes';
import { onlineOrdersEnabled, ordersOpeningMessage } from './shop/release';
type ResidenceType = '' | 'building' | 'private-house';
type OrderStep = 'catalog' | 'details';
type CheckoutField =
  | 'customerName'
  | 'phone'
  | 'cityId'
  | 'otherCity'
  | 'street'
  | 'houseNumber'
  | 'residenceType'
  | 'floor'
  | 'apartment'
  | 'pickupTime'
  | 'notes'
  | 'order';
type CheckoutErrors = Partial<Record<CheckoutField, string>>;
type DeliveryArea = {
  id: string;
  label: string;
  requiresConfirmation: boolean;
  notes: string;
};



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
    label: 'אחר',
    requiresConfirmation: true,
    notes: 'אזור המשלוח דורש בדיקה מול המאפייה.',
  },
];


function isValidIsraeliPhone(value: string) {
  return Boolean(normalizeIsraeliPhone(value));
}

function getProductDisplayPrice(product: ShopProduct) {
  return formatPrice(product.priceAgorot);
}

function getVisibleProductUnitNote(product: ShopProduct) {
  return saleUnit(product).comparison;
}

function getSelectionGroups(selections: CartSelection[] = []) {
  return selections.reduce<Record<string, CartSelection[]>>((groups, selection) => {
    groups[selection.groupName] = [...(groups[selection.groupName] ?? []), selection];
    return groups;
  }, Object.create(null) as Record<string, CartSelection[]>);
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

function hasIncludedPizzaChoice(product: ShopProduct) {
  return ['pizza-sambusak-01', 'pizza-sambusak-02', 'pizza-sambusak-03'].includes(product.id) && product.optionGroups.some((group) => group.required && group.minSelect === 1 && group.maxSelect === 3);
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
    const unitText = (unitNote ? ` (${unitNote})` : '') + (needsBusinessChoices(product) ? ' — פרטי הבחירה לא נבחרו באתר; נדרש תיאום עם המאפייה' : '');
    lines.push(`- ${product.name} x${quantity} - ${formatPrice(lineTotal(getCartItemUnitPrice(item), quantity))}${unitText}`);

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
  const { snapshot, status: shopStatus, isRefreshing, refresh, cancelRefresh } = usePublicShop();
  const [selectedCategory, setSelectedCategory] = useState(allCategory);
  const [initialCheckout] = useState(() => ({ ...readCheckoutSession(), draft: readCheckoutDraft() }));
  const [cart, setCart] = useState<Record<string, ShopCartItem>>(initialCheckout.cart);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderStep, setOrderStep] = useState<OrderStep>(onlineOrdersEnabled && Object.keys(initialCheckout.cart).length ? initialCheckout.draft.step : 'catalog');
  const [preferredFulfillment, setFulfillment] = useState<FulfillmentType>(initialCheckout.fulfillment);
  const [customerName, setCustomerName] = useState(initialCheckout.draft.customerName);
  const [phone, setPhone] = useState(initialCheckout.draft.phone);
  const [cityId, setCityId] = useState(initialCheckout.draft.cityId);
  const [otherCity, setOtherCity] = useState(initialCheckout.draft.otherCity);
  const [street, setStreet] = useState(initialCheckout.draft.street);
  const [houseNumber, setHouseNumber] = useState(initialCheckout.draft.houseNumber);
  const [residenceType, setResidenceType] = useState<ResidenceType>(initialCheckout.draft.residenceType);
  const [entrance, setEntrance] = useState(initialCheckout.draft.entrance);
  const [floor, setFloor] = useState(initialCheckout.draft.floor);
  const [apartment, setApartment] = useState(initialCheckout.draft.apartment);
  const [notes, setNotes] = useState(initialCheckout.draft.notes);
  const [copyStatus, setCopyStatus] = useState('');
  const [checkoutErrors, setCheckoutErrors] = useState<CheckoutErrors>({});
  const [minimumPromptVisible, setMinimumPromptVisible] = useState(false);
  const [addToastVisible, setAddToastVisible] = useState(false);
  const [operationalMessage, setOperationalMessage] = useState('');
  const [priceUpdateVisible, setPriceUpdateVisible] = useState(false);
  const [finalValidationPending, setFinalValidationPending] = useState(false);
  const [pickupTime, setPickupTime] = useState(initialCheckout.draft.pickupTime);
  const [pickupSlots, setPickupSlots] = useState<PickupSlot[]>([]);
  const [slotsError, setSlotsError] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [unresolvedOrder, setUnresolvedOrder] = useState(readOrderIntent);
  const [lastReceipt, setLastReceipt] = useState(readOrderReceipt);
  const [manualCopyVisible, setManualCopyVisible] = useState(false);
  const validationRef = useRef<{ id: number; pending: boolean }>({ id: 0, pending: false });
  const initialStepRef = useRef(orderStep);
  const historyReadyRef = useRef(false);
  const completedSubmissionRef = useRef(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [customizingProduct, setCustomizingProduct] = useState<ShopProduct | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [customizationError, setCustomizationError] = useState('');
  const cartPanelRef = useRef<HTMLElement | null>(null);
  const optionDialogRef = useRef<HTMLDivElement | null>(null);
  const [mobileCartLayout, setMobileCartLayout] = useState(() => window.matchMedia('(max-width: 980px)').matches);
  const cartIsModal = mobileCartLayout && cartOpen && orderStep === 'catalog';
  useEffect(() => {
    const media = window.matchMedia('(max-width: 980px)');
    const update = () => setMobileCartLayout(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!customizingProduct || !optionDialogRef.current) return;
    return activateModal(optionDialogRef.current, () => {
      setCustomizingProduct(null); setSelectedOptions({}); setCustomizationError('');
      if (editingCartItemId) setCartOpen(true);
      setEditingCartItemId(null);
    });
  }, [customizingProduct, editingCartItemId]);
  const checkoutStepRef = useRef<HTMLElement | null>(null);
  const categoryPickerRef = useRef<HTMLElement | null>(null);
  const categoryPickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const categoryPickerCloseRef = useRef<HTMLButtonElement | null>(null);

  const products = snapshot.products;
  const settings = snapshot.settings;
  const fulfillment = preferredFulfillment;
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
  const subtotal = orderTotals(cartItems, 0).subtotal;
  const selectedArea = deliveryAreas.find((area) => area.id === cityId);
  const cityLabel = cityId === 'other' ? otherCity.trim() : selectedArea?.label ?? '';
  const deliveryFee = fulfillment === 'delivery' ? settings.deliveryFeeAgorot : settings.pickupFeeAgorot;
  const total = orderTotals(cartItems, deliveryFee).total;
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
    !needsBusinessChoices(product) &&
    selectedFulfillmentEnabled &&
    (fulfillment === 'delivery' ? product.availableForDelivery : product.availableForPickup)
  );
  const deliveryAddressReady =
    fulfillment === 'pickup' ||
    (Boolean(selectedArea) && cityLabel.length > 0 &&
      street.trim().length > 1 &&
      houseNumber.trim().length > 0 &&
      residenceType.length > 0 &&
      (residenceType === 'private-house' || (floor.trim().length > 0 && apartment.trim().length > 0)));
  const orderSummary = buildOrderSummary({
    cartItems,
    fulfillment,
    selectedArea,
    customerName,
    phone: normalizeIsraeliPhone(phone),
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
  });
  const canSendOrder =
    cartItems.length > 0 &&
    customerName.trim().length > 1 &&
    isValidIsraeliPhone(phone) &&
    deliveryAddressReady &&
    !deliveryMinimumNotMet &&
    orderingAllowed &&
    selectedFulfillmentEnabled &&
    !cartHasInvalidItems &&
    !cartHasFulfillmentConflict;
  const canAttemptContinue = onlineOrdersEnabled && cartItems.length > 0 && orderingAllowed && selectedFulfillmentEnabled && !cartHasInvalidItems && !cartHasFulfillmentConflict;
  const cartBlockingMessage = !onlineOrdersEnabled ? ordersOpeningMessage : !isLive ? 'אי אפשר לאמת כרגע את ההזמנה. נסו שוב או פנו למאפייה.' : getOperationalBlock(settings, cartItems, fulfillment);

  const cancelValidation = useCallback(() => {
    const pending = validationRef.current.pending;
    validationRef.current.id += 1;
    validationRef.current.pending = false;
    if (pending) {
      cancelRefresh();
      setFinalValidationPending(false);
      setOperationalMessage(readOrderIntent() ? 'ההמתנה הופסקה, אך ייתכן שההזמנה נשמרה. בדקו את מצב השליחה לפני הזמנה נוספת.' : 'הבדיקה בוטלה. הסל והפרטים נשמרו ואפשר לנסות שוב.');
    }
  }, [cancelRefresh]);

  useEffect(() => {
    if (!cartIsModal || !cartPanelRef.current) return;
    return activateModal(cartPanelRef.current, () => { cancelValidation(); setCartOpen(false); });
  }, [cartIsModal, cancelValidation]);

  useEffect(() => {
    const validation = validationRef.current;
    if (!historyReadyRef.current) {
      historyReadyRef.current = true;
      const state = window.history.state ?? {};
      if (initialStepRef.current === 'details' && state.yachadCheckoutStep !== 'details') {
        window.history.replaceState({ ...state, yachadCheckoutStep: 'catalog' }, '');
        window.history.pushState({ ...state, yachadCheckoutStep: 'details', yachadHasCatalog: true }, '');
      } else window.history.replaceState({ ...state, yachadCheckoutStep: initialStepRef.current }, '');
    }
    const onPopState = (event: PopStateEvent) => {
      cancelValidation();
      setOrderStep(onlineOrdersEnabled && event.state?.yachadCheckoutStep === 'details' ? 'details' : 'catalog');
      setCartOpen(false);
      setCheckoutErrors({});
      };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      validation.id += 1;
      validation.pending = false;
    };
  }, [cancelValidation]);

  useEffect(() => {
    if (!completedSubmissionRef.current) writeCheckoutDraft({ step: orderStep, customerName, phone, cityId, otherCity, street, houseNumber, residenceType, entrance, floor, apartment, notes, pickupTime });
  }, [orderStep, customerName, phone, cityId, otherCity, street, houseNumber, residenceType, entrance, floor, apartment, notes, pickupTime]);

  useEffect(() => {
    if (!completedSubmissionRef.current) writeCheckoutSession(snapshot.live ? cartReconciliation.cart : cart, fulfillment);
  }, [cart, cartReconciliation, snapshot.live, fulfillment]);

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

    if (!categoryPickerRef.current) return;
    return activateModal(categoryPickerRef.current, () => setCategoryPickerOpen(false));
  }, [categoryPickerOpen]);

  useEffect(() => {
    if (orderStep !== 'details') {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      // A quick user tap/keystroke may already have focused another field.
      // Delayed initial focus must not steal it and put the phone in the name.
      if (checkoutStepRef.current?.contains(document.activeElement)) return;
      checkoutStepRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
      const firstField = checkoutStepRef.current?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input:not([type="radio"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      firstField?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [orderStep]);

  useEffect(() => {
    if (!minimumPromptVisible || !deliveryMinimumNotMet) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.querySelector('#shop-minimum-hint')?.scrollIntoView({
        block: 'nearest',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    });
  }, [minimumPromptVisible, deliveryMinimumNotMet, deliveryMinimumMissing]);

  const reloadPickupSlots = useCallback(async () => {
    setSlotsLoading(true); setSlotsError('');
    try { setPickupSlots(await fetchPickupSlots()); }
    catch { setSlotsError('לא הצלחנו לטעון מועדי איסוף. נסו שוב.'); }
    finally { setSlotsLoading(false); }
  }, []);
  useEffect(() => {
    if (fulfillment !== 'pickup' || orderStep !== 'details') return;
    const timer = window.setTimeout(() => void reloadPickupSlots(), 0);
    return () => window.clearTimeout(timer);
  }, [fulfillment, orderStep, reloadPickupSlots]);

  const renderFulfillmentSelector = (variant: 'summary' | 'form') => (
    <div className={`shop-fulfillment-block shop-fulfillment-block--${variant}`}>
      <div className="shop-choice-row" role="radiogroup" aria-label="שיטת קבלה">
        <label className={`${fulfillment === 'delivery' ? 'is-selected' : ''} ${!settings.deliveryEnabled ? 'is-disabled' : ''}`}>
          <input
            checked={fulfillment === 'delivery'}
            disabled={!settings.deliveryEnabled || !isLive || finalValidationPending}
            value="delivery"
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
            disabled={!settings.pickupEnabled || !isLive || finalValidationPending}
            value="pickup"
            name={`fulfillment-${variant}`}
            type="radio"
            onChange={() => {
              setFulfillment('pickup');
              // Keep an entered address when switching back; pickup summaries omit it.
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
      {fulfillment === 'pickup' && <div className="shop-pickup-info">
        <strong>איסוף מ{bakeryInfo.pickupAddress}</strong>
        <span>{bakeryInfo.hours.map((row, index) => <span key={row.days}>{index > 0 && ' · '}{row.days}: <bdi dir="ltr">{row.time}</bdi></span>)}</span>
        <span>יש להמתין לאישור המאפייה ולתיאום מועד האיסוף.</span>
      </div>}
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
    if (!onlineOrdersEnabled) return;
    if (validationRef.current.pending) return;
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

    const attempt = ++validationRef.current.id;
    validationRef.current.pending = true;
    setFinalValidationPending(true);
    setOperationalMessage('מאמתים מחירים וזמינות מול המאפייה…');
    try {
      const freshSnapshot = await refresh(true);
      if (attempt !== validationRef.current.id) return;
      const reconciled = reconcileCart(cart, freshSnapshot);
      setCart(reconciled.cart);
      if (reconciled.priceChanged || freshSnapshot.settings.deliveryFeeAgorot !== settings.deliveryFeeAgorot || freshSnapshot.settings.pickupFeeAgorot !== settings.pickupFeeAgorot) {
        setPriceUpdateVisible(true);
        setOperationalMessage('המחירים בהזמנה עודכנו. בדקו את הסכום לפני שממשיכים.');
        return;
      }
      const block = getOperationalBlock(freshSnapshot.settings, Object.values(reconciled.cart), fulfillment);
      if (block) {
        setOperationalMessage(block);
        return;
      }
      if (fulfillment === 'delivery' && orderTotals(Object.values(reconciled.cart), 0).subtotal < freshSnapshot.settings.minimumDeliverySubtotalAgorot) {
        setOperationalMessage(`מינימום הזמנה למשלוח הוא ${formatPrice(freshSnapshot.settings.minimumDeliverySubtotalAgorot)}.`);
        setMinimumPromptVisible(true);
        return;
      }
    } catch (error) {
      if (attempt !== validationRef.current.id) return;
      setOperationalMessage(error instanceof Error && error.message.includes('האימות נמשך') ? error.message : 'לא הצלחנו לאמת את פרטי ההזמנה. אפשר לנסות שוב או לפנות למאפייה.');
      return;
    } finally {
      if (attempt === validationRef.current.id) {
        validationRef.current.pending = false;
        setFinalValidationPending(false);
      }
    }

    if (attempt !== validationRef.current.id) return;
    if (window.history.state?.yachadCheckoutStep !== 'details') window.history.pushState({ ...window.history.state, yachadCheckoutStep: 'details', yachadHasCatalog: true }, '');
    setOrderStep('details');
    setOperationalMessage('');
    setCartOpen(false);
    setCopyStatus('');
    setCheckoutErrors({});
    setMinimumPromptVisible(false);
  };

  const goToCatalog = () => {
    cancelValidation();
    if (window.history.state?.yachadCheckoutStep === 'details' && window.history.state?.yachadHasCatalog) window.history.back();
    else {
      window.history.replaceState({ ...window.history.state, yachadCheckoutStep: 'catalog' }, '');
      setOrderStep('catalog');
    }
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
    priceProductSelections(product.id, getActiveOptionGroups(product).flatMap((group) => {
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
    }))
  );

  const openProductOptions = (product: ShopProduct, item?: ShopCartItem) => {
    setEditingCartItemId(item?.id ?? null);
    setSelectedOptions(item ? Object.fromEntries(product.optionGroups.map(group => [group.code, item.selections.filter(selection => selection.groupCode === group.code).map(selection => selection.optionCode)])) : {});
    if (item) setCartOpen(false);
    setCustomizationError('');
    setCustomizingProduct(product);
    setAddToastVisible(false);
  };

  const closeProductOptions = () => {
    if (editingCartItemId) setCartOpen(true);
    setEditingCartItemId(null);
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
    const unitPriceAgorot = unitPrice(currentProduct.priceAgorot, selections);

    setMinimumPromptVisible(false);
    const editingItem = editingCartItemId ? cart[editingCartItemId] : undefined;
    if (editingCartItemId && !editingItem) { setCustomizationError('הפריט כבר אינו בסל. סגרו את החלון ונסו שוב.'); return; }
    const mergedQuantity = (editingItem?.quantity ?? 1) + (itemId === editingCartItemId ? 0 : cart[itemId]?.quantity ?? 0);
    if (mergedQuantity > 999) { setCustomizationError('לא ניתן לשמור יותר מ־999 יחידות מאותו פריט.'); return; }
    setCart((current) => {
      const next = { ...current };
      if (editingCartItemId) delete next[editingCartItemId];
      next[itemId] = { id: itemId, productId: currentProduct.id, product: currentProduct, quantity: mergedQuantity, selections, unitPriceAgorot };
      return next;
    });
    closeProductOptions();
    if (!editingCartItemId) window.requestAnimationFrame(() => setAddToastVisible(true));
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
        quantity: Math.min(999, (current[itemId]?.quantity ?? 0) + 1),
        selections: [],
        unitPriceAgorot: product.priceAgorot,
      },
    }));
    window.requestAnimationFrame(() => setAddToastVisible(true));
  };

  const updateQuantity = (productId: string, nextQuantity: number) => {
    if (!Number.isSafeInteger(nextQuantity) || nextQuantity > 999) return;
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
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('Clipboard unavailable');
      }
      setCopyStatus('הסיכום הועתק');
      setManualCopyVisible(false);
    } catch {
      setCopyStatus('העתקה אוטומטית אינה זמינה. אפשר לסמן ולהעתיק את הסיכום שמתחת.');
      setManualCopyVisible(true);
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

    if (fulfillment === 'pickup' && !pickupSlots.some(slot => slot.startsAt === pickupTime && Date.parse(slot.startsAt) >= Date.now() + 60 * 60 * 1000)) {
      nextErrors.pickupTime = 'בחרו מועד איסוף זמין, לפחות שעה ממועד ההזמנה.';
    }
    if (fulfillment === 'delivery') {
      if (!deliveryAreas.some(area => area.id === cityId)) {
        nextErrors.cityId = 'בחרו עיר מרשימת אזורי המשלוח.';
      }
      if (cityId === 'other' && !otherCity.trim()) {
        nextErrors.otherCity = 'כתבו את שם המושב או היישוב.';
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
      'otherCity',
      'street',
      'houseNumber',
      'residenceType',
      'floor',
      'apartment',
      'pickupTime',
      'notes',
      'order',
    ];
    const firstInvalidField = fieldOrder.find((field) => nextErrors[field]);
    if (firstInvalidField) {
      window.requestAnimationFrame(() => {
        const target = document.getElementById(`checkout-${firstInvalidField}`);
        target?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        target?.focus({ preventScroll: true });
      });
    }

    return !firstInvalidField;
  };

  const finishStoredOrder = (created: CreatedOrder, input: CreateOrderInput, attempt: number) => {
    const owned = rememberOrderReceipt(created, input);
    if (attempt !== validationRef.current.id || !owned) {
      if (attempt === validationRef.current.id && !readOrderIntent()) window.location.assign('/order/' + created.trackingToken);
      else if (!validationRef.current.pending) {
        setLastReceipt(current => current && current.orderNumber > created.orderNumber ? current : created); setUnresolvedOrder(readOrderIntent());
        setOperationalMessage('ההזמנה הקודמת נשמרה וממתינה לאישור. הסל והפרטים שערכתם נשמרו; אפשר לפתוח את קישור המעקב.');
      }
      return;
    }
    completedSubmissionRef.current = true;
    writeCheckoutSession({}, input.fulfillmentType);
    writeCheckoutDraft({ ...emptyCheckoutDraft });
    setLastReceipt(created); setUnresolvedOrder(null); setCart({});
    window.location.assign('/order/' + created.trackingToken);
  };

  const recoverOrderSubmission = async () => {
    if (!onlineOrdersEnabled) return;
    const input = readOrderIntent();
    if (!input || validationRef.current.pending) return;
    const attempt = ++validationRef.current.id;
    validationRef.current.pending = true; setFinalValidationPending(true);
    setOperationalMessage('בודקים את השליחה הקודמת. לא תיווצר הזמנה כפולה.');
    try {
      const found = await fetchTrackedOrder(input.trackingToken);
      const created = found ? { orderNumber: found.orderNumber, trackingToken: input.trackingToken } : await createOrder(input);
      finishStoredOrder(created, input, attempt);
    } catch (error) {
      if (attempt !== validationRef.current.id) return;
      if (error instanceof OrderSubmissionError && error.definitive && error.code !== 'IDEMPOTENCY_CONFLICT') { clearOrderIntent(input); setUnresolvedOrder(readOrderIntent()); }
      setOperationalMessage(error instanceof Error ? error.message : 'לא ניתן לבדוק את ההזמנה כרגע. נסו שוב כשיש חיבור.');
      if (input.fulfillmentType === 'pickup') void reloadPickupSlots();
      void refresh(true).catch(() => undefined);
    } finally { if (attempt === validationRef.current.id) { validationRef.current.pending = false; setFinalValidationPending(false); } }
  };

  const submitOnlineOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (validationRef.current.pending) return;
    if (readOrderIntent()) { setUnresolvedOrder(readOrderIntent()); void recoverOrderSubmission(); return; }
    if (!validateCheckout()) return;
    const attempt = ++validationRef.current.id;
    validationRef.current.pending = true; setFinalValidationPending(true);
    let submittedInput: CreateOrderInput | null = null;
    setOperationalMessage('מאמתים מחירים וזמינות לפני שמירת ההזמנה…');
    try {
      const fresh = await refresh(true);
      if (attempt !== validationRef.current.id) return;
      const reconciled = reconcileCart(cart, fresh); setCart(reconciled.cart);
      const freshItems = Object.values(reconciled.cart), block = getOperationalBlock(fresh.settings, freshItems, fulfillment);
      if (block) { setOperationalMessage(block); setCheckoutErrors(current => ({ ...current, order: block })); return; }
      const freshSubtotal = orderTotals(freshItems, 0).subtotal;
      if (fulfillment === 'delivery' && freshSubtotal < fresh.settings.minimumDeliverySubtotalAgorot) {
        setOperationalMessage('הסל אינו מגיע למינימום המשלוח העדכני.'); return;
      }
      if (reconciled.priceChanged || fresh.settings.deliveryFeeAgorot !== settings.deliveryFeeAgorot || fresh.settings.pickupFeeAgorot !== settings.pickupFeeAgorot) {
        setPriceUpdateVisible(true); setOperationalMessage('המחיר או דמי המשלוח עודכנו. בדקו את הסיכום ושלחו שוב.'); return;
      }
      const fee = fulfillment === 'delivery' ? fresh.settings.deliveryFeeAgorot : fresh.settings.pickupFeeAgorot;
      const input = persistOrderIntent({
        fulfillmentType: fulfillment, requestedPickupAt: fulfillment === 'pickup' ? pickupTime : null,
        customerName: customerName.trim(), phone: normalizeIsraeliPhone(phone), customerNotes: notes.trim(),
        deliveryAddress: fulfillment === 'delivery' ? { city_id: cityId, city: cityLabel, street: street.trim(), house_number: houseNumber.trim(), residence_type: residenceType,
          ...(residenceType === 'building' ? { entrance: entrance.trim(), floor: floor.trim(), apartment: apartment.trim() } : {}) } : null,
        items: freshItems.map(item => ({ product_id: item.productId, quantity: item.quantity, option_ids: item.selections.map(option => option.optionId) })),
        expectedTotalAgorot: orderTotals(freshItems, fee).total,
      });
      submittedInput = input;
      setUnresolvedOrder(input); setOperationalMessage('שומרים את ההזמנה במאפייה…');
      const created = await createOrder(input);
      finishStoredOrder(created, input, attempt);
    } catch (error) {
      if (attempt !== validationRef.current.id) return;
      const definitive = error instanceof OrderSubmissionError && error.definitive && error.code !== 'IDEMPOTENCY_CONFLICT';
      if (definitive && submittedInput) { clearOrderIntent(submittedInput); setUnresolvedOrder(readOrderIntent()); }
      const message = error instanceof Error ? error.message : 'לא התקבלה תשובה ברורה. בדקו את מצב השליחה לפני הזמנה נוספת.';
      setOperationalMessage(message); setCheckoutErrors(current => ({ ...current, order: message }));
      if (fulfillment === 'pickup') void reloadPickupSlots();
      if (definitive) void refresh(true).catch(() => undefined);
    } finally { if (attempt === validationRef.current.id) { validationRef.current.pending = false; setFinalValidationPending(false); } }
  };

  const renderCheckoutError = (field: CheckoutField) => (
    checkoutErrors[field] ? (
      <span className="shop-field-error" id={`checkout-${field}-error`} role="alert">
        {checkoutErrors[field]}
      </span>
    ) : null
  );

  return (
    <main className={`shop-shell ${orderStep === 'details' ? 'is-details-step' : ''}`} dir="rtl" aria-busy={finalValidationPending}>
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
          <h1 className="shop-sr-only">{onlineOrdersEnabled ? 'הזמנה אונליין ממאפיית יחד' : 'התפריט והסל של מאפיית יחד'}</h1>
          <img src={shopCoverImage} alt="מאפיית יחד - טרי, איכותי, מהלב. מאפים טריים, כל יום, באהבה." decoding="async" />
          <a className="shop-cover-link" href="/">
            <ArrowRight size={19} weight="bold" />
            לאתר המאפייה
          </a>
        </section>
      )}

      {orderStep === 'catalog' && <div className="shop-service-info">
        <span>משלוחים בכפר סבא, הוד השרון ורעננה · יישובים נוספים בכפוף לאישור</span>
        <a href={bakeryInfo.phoneHref}>שאלות על ההזמנה? <bdi>{bakeryInfo.phone}</bdi></a>
      </div>}
      {orderStep === 'catalog' && cartItems.length === 0 && renderFulfillmentSelector('summary')}
      <div className="shop-live-status" aria-live="polite">
        {!onlineOrdersEnabled && <div className="shop-status-banner is-info" data-testid="catalog-only"><strong>הזמנות אונליין ייפתחו בקרוב</strong><span>בינתיים אפשר לעיין בתפריט ולהרכיב סל. לא נשלחת הזמנה ולא מתבצע חיוב.</span></div>}
        {shopStatus === 'loading' && (
          <div className="shop-status-banner is-loading" data-testid="shop-loading">
            טוענים את התפריט העדכני…
          </div>
        )}
        {shopStatus === 'degraded' && (
          <div className="shop-status-banner is-warning" data-testid="shop-degraded">
            <div>
              <strong>לא הצלחנו כרגע לטעון את החנות</strong>
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
            {!settings.deliveryEnabled && settings.pickupEnabled && 'אין משלוחים כרגע. אפשר לבחור איסוף עצמי.'}
            {settings.deliveryEnabled && !settings.pickupEnabled && 'איסוף עצמי אינו זמין כרגע. ניתן לבצע משלוח.'}
            {!settings.deliveryEnabled && !settings.pickupEnabled && 'משלוחים ואיסוף עצמי מושהים כרגע. ניתן לעיין בתפריט בלבד.'}
          </div>
        )}
        {isCustomerNoticeVisible(settings) && (
          <div className={`shop-status-banner is-notice-${settings.customerNoticeType}`} data-testid="customer-notice">
            {settings.customerNoticeText}
          </div>
        )}
        {(priceUpdateVisible || cartReconciliation.priceChanged) && !cartOpen && orderStep === 'catalog' && (
          <div className="shop-status-banner is-info" data-testid="price-updated">
            המחירים בהזמנה עודכנו לפי התפריט החי.
          </div>
        )}
        {operationalMessage && cartItems.length === 0 && (
          <div className="shop-status-banner is-info" data-testid="operational-message">
            {operationalMessage}
          </div>
        )}
      </div>

      {unresolvedOrder && <section className="shop-submission-recovery" role="status"><strong>יש בקשת הזמנה שצריך לבדוק</strong><p>ייתכן שכבר נשמרה. בדיקת השליחה תחזור לאותה הזמנה ותמנע כפילות; אין צורך למלא או לשלוח מחדש.</p><button type="button" disabled={finalValidationPending} onClick={() => void recoverOrderSubmission()}>בדיקת מצב השליחה</button></section>}
      {lastReceipt && <p className="shop-last-order"><a href={'/order/' + lastReceipt.trackingToken}>למעקב אחר הזמנה #{lastReceipt.orderNumber}</a></p>}
      <div className={`shop-layout ${orderStep === 'details' ? 'is-checkout-step' : ''}`}>
        {orderStep === 'catalog' ? (
          <section className="shop-products" aria-label="תפריט מאפיית יחד" inert={finalValidationPending}>

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

            <p className="shop-food-notice">מידע על אלרגנים, מרכיבים וכמות עדיין אינו מלא בכל המוצרים. לבירור לפני הזמנה: <a href={bakeryInfo.phoneHref}><bdi>{bakeryInfo.phone}</bdi></a>.</p>
            {visibleProducts.length === 0 && <div className="shop-empty-products" role="status">אין כרגע מוצרים בקטגוריה הזו. {selectedCategory !== allCategory && <button type="button" onClick={() => setSelectedCategory(allCategory)}>לכל המוצרים</button>}</div>}
            <div className="shop-grid">
              {visibleProducts.map((product, index) => {
                const itemId = makeCartItemId(product);
                const cartItem = cart[itemId];
                const productHasOptions = hasProductOptions(product);
                const displayPrice = getProductDisplayPrice(product);

                return (
                  <article className={`shop-product-card ${isLive && !product.availableToday ? 'is-unavailable' : ''}`} key={product.id} data-product-id={product.id}>
                    <ProductImage key={product.imageUrl} src={product.imageUrl} name={product.name} eager={index < 6} />
                    <div className="shop-product-body">
                      <div className="shop-product-copy">
                        <div className="shop-product-heading">
                          <h3>{product.name}</h3>
                          {isLive && !product.availableToday && <span className="shop-stock-badge">{product.unavailableReason ? 'לבירור' : 'אזל להיום'}</span>}
                        </div>
                        {product.description ? <p>{product.description}</p> : null}
                      </div>
                      <div className="shop-product-foot">
                        <div className="shop-price-stack">
                          {needsBusinessChoices(product) && <small>ההרכבה מתבצעת בתיאום עם המאפייה. לא ניתן להוסיף בלי בחירת מרכיבים.</small>}
                          {product.unavailableReason && <small>{product.unavailableReason}</small>}
                          {hasIncludedPizzaChoice(product) && <small>לבחירה: עד 3 תוספות: הראשונה כלולה במחיר, כל תוספת נוספת ב־5 ₪.</small>}
                          <strong dir="ltr" aria-label={displayPrice}>
                            <span className="shop-price-currency" aria-hidden="true">₪</span>
                            <bdi className="shop-price-amount" dir="ltr">{displayPrice.replace('₪', '').trim()}</bdi>
                          </strong>
                          {getVisibleProductUnitNote(product) && <span><bdi>{getVisibleProductUnitNote(product)}</bdi></span>}
                        </div>
                        {needsBusinessChoices(product) ? <a className="shop-inquiry-button" href={bakeryInfo.phoneHref}>לתיאום עם המאפייה</a> : cartItem && !productHasOptions ? (
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
                            {!isLive ? 'לא ניתן להזמין כרגע' : product.unavailableReason ? 'לא זמין להזמנה' : !product.availableToday ? 'אזל להיום' : 'הוספה'}
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
                  <span>סיכום ההזמנה <button className="shop-edit-cart-link" type="button" onClick={goToCatalog}>עריכת הסל</button></span>
                  <strong><bdi>{formatPrice(total)}</bdi></strong>
                </div>
                <ul className="shop-checkout-overview-items" aria-label="פריטים בהזמנה">
                  {cartItems.map((item) => {
                    const selectionGroups = getSelectionGroups(item.selections);
                    const itemUnitPrice = getCartItemUnitPrice(item);
                    return (
                      <li className="shop-checkout-overview-item" key={item.id}>
                        <div className="shop-checkout-overview-item-main">
                          <span>{item.quantity} × {item.product.name}</span>
                          <strong><bdi>{formatPrice(lineTotal(itemUnitPrice, item.quantity))}</bdi></strong>
                        </div>
                        {item.quantity > 1 && <span className="shop-checkout-overview-item-note"><bdi>{formatPrice(itemUnitPrice)}</bdi> ליח׳</span>}
                        {Object.entries(selectionGroups).map(([groupName, selections]) => (
                          <span className="shop-checkout-overview-item-note" key={groupName}>
                            {groupName}: {selections.map(formatOptionLabel).join(', ')}
                          </span>
                        ))}
                      </li>
                    );
                  })}
                </ul>
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
                inert={finalValidationPending}
                onSubmit={submitOnlineOrder}
              >
                <div className="shop-form-panel shop-form-panel--fulfillment">
                  <div className="shop-form-title">אופן קבלה</div>
                  {renderFulfillmentSelector('form')}
                </div>

                {fulfillment === 'pickup' && <div className="shop-form-panel shop-form-panel--timing">
                  <label htmlFor="checkout-pickupTime"><span className="shop-field-label">מועד איסוף <span aria-hidden="true">*</span></span>
                    <select id="checkout-pickupTime" value={pickupTime} onChange={event => { setPickupTime(event.target.value); clearCheckoutError('pickupTime'); }} disabled={slotsLoading} required aria-required="true" aria-invalid={Boolean(checkoutErrors.pickupTime)} aria-describedby="pickup-time-help">
                      <option value="">{slotsLoading ? 'טוענים מועדי איסוף…' : 'בחרו תאריך ושעה'}</option>
                      {pickupSlots.map(slot => <option key={slot.startsAt} value={slot.startsAt}>{new Intl.DateTimeFormat('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' }).format(new Date(slot.startsAt))}</option>)}
                    </select>
                    <span className="shop-field-help" id="pickup-time-help">המועד שבחרתם כפוף לאישור המאפייה. אין עדיין אישור להגיע.</span>
                    {renderCheckoutError('pickupTime')}
                  </label>
                  {slotsError && <p className="shop-field-error" role="alert">{slotsError}</p>}
                  {!slotsLoading && !slotsError && pickupSlots.length === 0 && <p>אין כרגע מועדי איסוף פנויים. אפשר לפנות למאפייה.</p>}
                  <button type="button" className="shop-edit-cart-link" onClick={() => void reloadPickupSlots()} disabled={slotsLoading}>רענון מועדי איסוף</button>
                </div>}
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
                        maxLength={100}
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
                          <span className="shop-field-label">עיר / יישוב <span aria-hidden="true">*</span></span>
                          <select
                            id="checkout-cityId"
                            name="city"
                            value={cityId}
                            onChange={(event) => {
                              setCityId(event.target.value);
                              setStreet('');
                              clearCheckoutError('cityId');
                              clearCheckoutError('otherCity');
                              clearCheckoutError('street');
                            }}
                            autoComplete="address-level2"
                            aria-invalid={Boolean(checkoutErrors.cityId)}
                            aria-describedby={checkoutErrors.cityId ? 'checkout-cityId-error' : undefined}
                            aria-required="true"
                            required
                          >
                            <option value="">בחרו עיר או יישוב</option>
                            {deliveryAreas.map((area) => (
                              <option key={area.id} value={area.id}>
                                {area.label}
                              </option>
                            ))}
                          </select>
                          {renderCheckoutError('cityId')}
                        </label>
                        {cityId === 'other' && (
                          <label htmlFor="checkout-otherCity">
                            <span className="shop-field-label">שם המושב או היישוב <span aria-hidden="true">*</span></span>
                            <input
                              id="checkout-otherCity"
                              name="otherCity"
                              value={otherCity}
                              onChange={(event) => {
                                setOtherCity(event.target.value);
                                clearCheckoutError('otherCity');
                              }}
                              placeholder="כתבו את שם המושב או היישוב"
                              autoComplete="address-level2"
                              aria-invalid={Boolean(checkoutErrors.otherCity)}
                              aria-describedby={checkoutErrors.otherCity ? 'checkout-otherCity-error' : undefined}
                              aria-required="true"
                              required
                            />
                            {renderCheckoutError('otherCity')}
                          </label>
                        )}
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
                            כניסה
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
                    <span className="shop-field-label">הערות להזמנה</span>
                    <textarea
                      id="checkout-notes"
                      name="notes"
                      value={notes}
                      onChange={(event) => {
                        setNotes(event.target.value);
                        clearCheckoutError('notes');
                      }}
                      maxLength={1000}
                      placeholder={fulfillment === 'pickup' ? 'בקשות מיוחדות או מידע שחשוב לציין לאיסוף' : 'קוד בלובי, להשאיר מחוץ לדלת, להתקשר כשמגיעים'}
                      aria-invalid={Boolean(checkoutErrors.notes)}
                      aria-describedby={checkoutErrors.notes ? 'checkout-notes-error' : undefined}
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
          ref={cartPanelRef}
          role={cartIsModal ? 'dialog' : undefined}
          aria-modal={cartIsModal ? true : undefined}
          inert={mobileCartLayout && !cartOpen && orderStep === 'catalog'}
          tabIndex={-1}
          className={`shop-cart-panel ${cartOpen ? 'is-open' : ''} ${orderStep === 'details' ? 'is-checkout-summary' : ''}`}
          aria-label="ההזמנה שלי"
        >
          <div className="shop-cart-head">
            <h2>ההזמנה שלי</h2>
            <button className="shop-cart-close" type="button" onClick={() => { cancelValidation(); setCartOpen(false); }} aria-label="סגור הזמנה">
              <X size={20} weight="bold" />
            </button>
          </div>

          <div className="shop-cart-scroll" inert={finalValidationPending}>
            {cartItems.length ? (
              <div className="shop-cart-items">
                {cartItems.map((item) => {
                  const { id, product, quantity } = item;
                  const selectionGroups = getSelectionGroups(item.selections);
                  const itemUnitPrice = getCartItemUnitPrice(item);
                  const unitNote = getVisibleProductUnitNote(product);
                  const itemMeta = [quantity > 1 ? `${formatPrice(itemUnitPrice)} ליח׳` : '', unitNote]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <div className="shop-cart-item" key={id}>
                      <div className="shop-cart-item-content">
                        <div className="shop-cart-item-top">
                          <strong className="shop-cart-item-name">{product.name}</strong>
                          <strong className="shop-cart-line-total"><bdi>{formatPrice(lineTotal(itemUnitPrice, quantity))}</bdi></strong>
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
                        {(item.invalidReason || (fulfillment === 'delivery' ? !product.availableForDelivery : !product.availableForPickup)) && (
                          <p className="shop-cart-item-warning" role="alert">{item.invalidReason || `המוצר אינו זמין ל${fulfillment === 'delivery' ? 'משלוח' : 'איסוף עצמי'}. בחרו שיטה אחרת או הסירו אותו.`}</p>
                        )}
                      </div>
                      <div className="shop-cart-item-actions">
                        {hasProductOptions(product) && <button className="shop-remove-item" type="button" onClick={() => openProductOptions(product, item)} aria-label={`עריכת ${product.name}`}>עריכה</button>}
                        <div className="shop-quantity" aria-label={`כמות ${product.name}`}>
                          <button type="button" onClick={() => updateQuantity(id, quantity - 1)} aria-label={`הפחתת ${product.name}`}>
                            <Minus size={16} weight="bold" />
                          </button>
                          <span aria-live="polite">{quantity}</span>
                          <button type="button" onClick={() => updateQuantity(id, quantity + 1)} aria-label={`הוספת ${product.name}`} disabled={quantity >= 999 || Boolean(item.invalidReason) || !isProductOrderable(product)}>
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
                  <span>{fulfillment === 'delivery' ? 'דמי משלוח' : 'איסוף עצמי'}</span>
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

              {fulfillment === 'delivery' && cityId === 'other' && <p className="shop-warning">המשלוח ליישוב שבחרתם, מועדו והעלות הסופית דורשים אישור של המאפייה לפני השלמת ההזמנה.</p>}
              {(operationalMessage || cartBlockingMessage || finalValidationPending || priceUpdateVisible || cartReconciliation.priceChanged) && <div className="shop-cart-feedback" data-testid="cart-feedback" role="status" aria-live="polite">
                <p>{finalValidationPending ? 'מאמתים מחירים וזמינות מול המאפייה…' : operationalMessage || cartBlockingMessage || 'המחירים בהזמנה עודכנו. בדקו את הסכום לפני שממשיכים.'}</p>
                {finalValidationPending && <button type="button" onClick={cancelValidation}>ביטול הבדיקה</button>}
                {!finalValidationPending && shopStatus === 'degraded' && <button type="button" onClick={() => void refresh(true).catch(() => undefined)} disabled={isRefreshing}>ניסיון חוזר</button>}
              </div>}

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
                    {onlineOrdersEnabled ? 'המשך לפרטי הזמנה' : 'הזמנות אונליין בקרוב'}
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
                    disabled={finalValidationPending || !canAttemptContinue}
                  >
                    <CheckCircle size={21} weight="bold" />
                    {finalValidationPending ? 'שומרים את ההזמנה…' : 'שליחת הזמנה לאישור'}
                  </button>
                  <p className="shop-whatsapp-helper" id="checkout-whatsapp-helper">
                    ההזמנה תישמר ותמתין לאישור המאפייה. אין כאן תשלום מקוון ולא מתבצע חיוב.
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
                  {copyStatus && <span className="shop-copy-status" role="status">{copyStatus}</span>}
                  {manualCopyVisible && <label className="shop-manual-copy">סיכום להעתקה ידנית<textarea readOnly rows={7} value={orderSummary} onFocus={event => event.currentTarget.select()} /></label>}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      <footer className="shop-footer">
        <p>{bakeryInfo.name} · {bakeryInfo.pickupAddress} · <a href={bakeryInfo.phoneHref}><bdi>{bakeryInfo.phone}</bdi></a></p>
        <p>הטיוטה נשמרת זמנית בלשונית הזו. הזמנה שנשלחה נשמרת במערכת וממתינה לאישור המאפייה. אין כאן תשלום מקוון.</p>
        <LegalLinks />
      </footer>

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
        <div ref={optionDialogRef} tabIndex={-1} className="shop-option-backdrop" role="dialog" aria-modal="true" aria-labelledby="shop-option-title">
          <div className="shop-option-drawer">
            <div className="shop-option-head">
              <div>
                <span className="shop-kicker">התאמה אישית</span>
                <h2 id="shop-option-title">{displayedCustomizingProduct.name}</h2>
                <p>מחיר בסיס: {formatPrice(displayedCustomizingProduct.priceAgorot)}</p>
                {hasIncludedPizzaChoice(displayedCustomizingProduct) && <p>עד 3 תוספות: הראשונה כלולה במחיר, כל תוספת נוספת ב־5 ₪.</p>}
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
                            {!hasIncludedPizzaChoice(displayedCustomizingProduct) && option.priceDeltaAgorot > 0 && <bdi>+{formatPrice(option.priceDeltaAgorot)}</bdi>}
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
                סה״כ <bdi>{formatPrice(unitPrice(displayedCustomizingProduct.priceAgorot, getSelectedProductOptions(displayedCustomizingProduct, selectedOptions)))}</bdi>
              </strong>
              <button type="button" onClick={addConfiguredProductToCart}>
                <Plus size={18} weight="bold" />
                {editingCartItemId ? 'שמירת שינויים' : 'הוספה להזמנה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
