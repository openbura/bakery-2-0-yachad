const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../project/src/ShopPage.tsx');let s=fs.readFileSync(file,'utf8');
if(!s.includes('const submitOrderToWhatsapp = async'))throw Error('Expected temporary WhatsApp baseline; patch not repeated');
s=s.replace('  WhatsappLogo,','  CheckCircle,');
s=s.replace("import { LegalLinks } from './LegalPage';",`import { LegalLinks } from './LegalPage';
import { createOrder, fetchPickupSlots, fetchTrackedOrder, OrderSubmissionError } from './services/ordersRepository';
import { clearOrderIntent, persistOrderIntent, readOrderIntent, readOrderReceipt, rememberOrderReceipt } from './shop/orderSubmission';
import { emptyCheckoutDraft } from './shop/checkoutSession';
import type { CreateOrderInput, CreatedOrder, PickupSlot } from './shop/orderTypes';`);
s=s.replace("  | 'notes'","  | 'pickupTime'\n  | 'notes'").replace('const bakeryWhatsappNumber = bakeryInfo.whatsappNumber;','');
s=s.replace("  const [whatsappHandoff, setWhatsappHandoff] = useState<{ url: string; summary: string } | null>(null);",`  const [pickupTime, setPickupTime] = useState(initialCheckout.draft.pickupTime);
  const [pickupSlots, setPickupSlots] = useState<PickupSlot[]>([]);
  const [slotsError, setSlotsError] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [unresolvedOrder, setUnresolvedOrder] = useState(readOrderIntent);
  const [lastReceipt, setLastReceipt] = useState(readOrderReceipt);`);
s=s.replaceAll('    setWhatsappHandoff(null);\n','').replaceAll('      setWhatsappHandoff(null);\n','');
s=s.replace('id: number; pending: boolean; popup: Window | null','id: number; pending: boolean').replace('{ id: 0, pending: false, popup: null }','{ id: 0, pending: false }');
s=s.replaceAll('    validationRef.current.popup?.close();\n','').replaceAll('    validationRef.current.popup = null;\n','').replaceAll('      validation.popup?.close();\n','').replaceAll('      validation.popup = null;\n','');
s=s.replace("setOperationalMessage('הבדיקה בוטלה. הסל והפרטים נשמרו ואפשר לנסות שוב.');","setOperationalMessage(readOrderIntent() ? 'ההמתנה הופסקה, אך ייתכן שההזמנה נשמרה. בדקו את מצב השליחה לפני הזמנה נוספת.' : 'הבדיקה בוטלה. הסל והפרטים נשמרו ואפשר לנסות שוב.');");
s=s.replace('residenceType, entrance, floor, apartment, notes });','residenceType, entrance, floor, apartment, notes, pickupTime });').replace('[orderStep, customerName, phone, cityId, otherCity, street, houseNumber, residenceType, entrance, floor, apartment, notes]','[orderStep, customerName, phone, cityId, otherCity, street, houseNumber, residenceType, entrance, floor, apartment, notes, pickupTime]');
const slots=`  const reloadPickupSlots = useCallback(async () => {
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

`;
s=s.replace('  const renderFulfillmentSelector =',slots+'  const renderFulfillmentSelector =');
s=s.replace('    if (fulfillment === \'delivery\') {\n      if (!deliveryAreas',`    if (fulfillment === 'pickup' && !pickupSlots.some(slot => slot.startsAt === pickupTime && Date.parse(slot.startsAt) >= Date.now() + 60 * 60 * 1000)) nextErrors.pickupTime = 'בחרו מועד איסוף זמין, לפחות שעה ממועד ההזמנה.';
    if (fulfillment === 'delivery') {
      if (!deliveryAreas`);
s=s.replace("      'notes',\n      'order',","      'pickupTime',\n      'notes',\n      'order',");
const start=s.indexOf('  const submitOrderToWhatsapp = async');const end=s.indexOf('  const renderCheckoutError',start);
const handler=`  const finishStoredOrder = (created: CreatedOrder, input: CreateOrderInput, attempt: number) => {
    rememberOrderReceipt(created);
    writeCheckoutSession({}, input.fulfillmentType);
    writeCheckoutDraft({ ...emptyCheckoutDraft });
    setLastReceipt(created); setUnresolvedOrder(null); setCart({});
    if (attempt === validationRef.current.id) window.location.assign('/order/' + created.trackingToken);
    else setOperationalMessage('ההזמנה נשמרה וממתינה לאישור. אפשר לפתוח את קישור ההזמנה האחרונה.');
  };

  const recoverOrderSubmission = async () => {
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
      if (error instanceof OrderSubmissionError && error.definitive && error.code !== 'IDEMPOTENCY_CONFLICT') { clearOrderIntent(); setUnresolvedOrder(null); }
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
      setUnresolvedOrder(input); setOperationalMessage('שומרים את ההזמנה במאפייה…');
      const created = await createOrder(input);
      finishStoredOrder(created, input, attempt);
    } catch (error) {
      if (attempt !== validationRef.current.id) return;
      const definitive = error instanceof OrderSubmissionError && error.definitive && error.code !== 'IDEMPOTENCY_CONFLICT';
      if (definitive) { clearOrderIntent(); setUnresolvedOrder(null); }
      const message = error instanceof Error ? error.message : 'לא התקבלה תשובה ברורה. בדקו את מצב השליחה לפני הזמנה נוספת.';
      setOperationalMessage(message); setCheckoutErrors(current => ({ ...current, order: message }));
      if (fulfillment === 'pickup') void reloadPickupSlots();
      if (definitive) void refresh(true).catch(() => undefined);
    } finally { if (attempt === validationRef.current.id) { validationRef.current.pending = false; setFinalValidationPending(false); } }
  };

`;
s=s.slice(0,start)+handler+s.slice(end);
s=s.replace('onSubmit={submitOrderToWhatsapp}','onSubmit={submitOnlineOrder}');
s=s.replace('autoComplete="name"','autoComplete="name"\n                        maxLength={100}');
const timing=`                {fulfillment === 'pickup' && <div className="shop-form-panel shop-form-panel--timing">
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
`;
s=s.replace('                <div className="shop-form-panel">\n                  <div className="shop-form-title">פרטי קשר',timing+'                <div className="shop-form-panel">\n                  <div className="shop-form-title">פרטי קשר');
s=s.replace('      <div className={`shop-layout',`      {unresolvedOrder && <section className="shop-submission-recovery" role="status"><strong>יש בקשת הזמנה שצריך לבדוק</strong><p>ייתכן שכבר נשמרה. בדיקת השליחה תחזור לאותה הזמנה ותמנע כפילות; אין צורך למלא או לשלוח מחדש.</p><button type="button" disabled={finalValidationPending} onClick={() => void recoverOrderSubmission()}>בדיקת מצב השליחה</button></section>}
      {lastReceipt && <p className="shop-last-order"><a href={'/order/' + lastReceipt.trackingToken}>למעקב אחר הזמנה #{lastReceipt.orderNumber}</a></p>}
      <div className={\u0060shop-layout`);
s=s.replace("{finalValidationPending ? 'מאמתים את ההזמנה…' : 'המשך לוואטסאפ'}","{finalValidationPending ? 'שומרים את ההזמנה…' : 'שליחת הזמנה לאישור'}");
s=s.replace('<WhatsappLogo size={21} weight="bold" />','<CheckCircle size={21} weight="bold" />');
s=s.replace('בוואטסאפ יש ללחוץ על שליחה ולהמתין לאישור המאפייה. פתיחת הצ׳אט אינה אישור הזמנה.','ההזמנה תישמר ותמתין לאישור המאפייה. אין כאן תשלום מקוון ולא מתבצע חיוב.');
s=s.replace(/\s*\{whatsappHandoff && whatsappHandoff\.summary === orderSummary[^\n]+\n/,'\n');
s=s.replace('הטיוטה נשמרת זמנית בלשונית הזו, כדי שתוכלו לחזור לטופס. אין כאן עדיין תשלום מקוון.','הטיוטה נשמרת זמנית בלשונית הזו. הזמנה שנשלחה נשמרת במערכת וממתינה לאישור המאפייה. אין כאן תשלום מקוון.');
fs.writeFileSync(file,s);console.log('Merged online submission into repaired shop; preserved existing validation and cart controls.');
