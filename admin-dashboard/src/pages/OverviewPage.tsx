import {
  BellRinging,
  CheckCircle,
  ClockCounterClockwise,
  Package,
  PencilSimple,
  ShoppingBagOpen,
  Storefront,
  Truck,
  WarningCircle,
} from '@phosphor-icons/react';
import type { ComponentType } from 'react';
import { BakeryLiveClock } from '../components/BakeryLiveClock';
import type { Product, StoreSettings } from '../types/dashboard';

type OverviewProps = {
  settings: StoreSettings;
  products: Product[];
  onToggleOrdering: () => void;
  onToggleDelivery: () => void;
  onTogglePickup: () => void;
  onToggleNotice: () => void;
  onEditNotice: () => void;
  savingControl: 'ordering' | 'delivery' | 'pickup' | 'notice' | null;
};

type QuickControlProps = {
  label: string;
  activeLabel: string;
  inactiveLabel: string;
  active: boolean;
  icon: ComponentType<{ size?: number; weight?: 'regular' | 'duotone' }>;
  onToggle: () => void;
  onEdit?: () => void;
  saving: boolean;
  disabled: boolean;
};

function QuickControl({ label, activeLabel, inactiveLabel, active, icon: Icon, onToggle, onEdit, saving, disabled }: QuickControlProps) {
  const stateLabel = active ? activeLabel : inactiveLabel;

  return (
    <article className={`quick-control ${active ? 'is-active' : 'is-paused'}`}>
      <div className="quick-control__main">
        <span className="quick-control__icon"><Icon size={23} weight="duotone" /></span>
        <div className="quick-control__copy">
          <strong>{label}</strong>
          <span className="quick-control__state" aria-live="polite" aria-atomic="true">
            {active ? <CheckCircle size={17} weight="fill" /> : <WarningCircle size={17} weight="fill" />}
            {saving ? 'שומר…' : stateLabel}
          </span>
        </div>
      </div>
      <div className="quick-control__actions">
        {onEdit && <button className="quick-control__edit" type="button" onClick={onEdit} disabled={disabled}><PencilSimple size={18} /> עריכת ההודעה</button>}
        <button
          className="quick-switch"
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={`${label}: ${saving ? 'שומר' : stateLabel}`}
          aria-busy={saving}
          disabled={disabled}
          onClick={onToggle}
        >
          <span aria-hidden="true"><span /></span>
        </button>
      </div>
    </article>
  );
}

export function OverviewPage({ settings, products, onToggleOrdering, onToggleDelivery, onTogglePickup, onToggleNotice, onEditNotice, savingControl }: OverviewProps) {
  const availableCount = products.filter((product) => product.available).length;
  const unavailableCount = products.length - availableCount;

  const statuses = [
    { label: 'הזמנות אונליין', value: settings.orderingEnabled ? 'פתוחות' : 'סגורות', active: settings.orderingEnabled, icon: ShoppingBagOpen },
    { label: 'משלוחים', value: settings.deliveryEnabled ? 'פעילים' : 'מושהים', active: settings.deliveryEnabled, icon: Truck },
    { label: 'איסוף עצמי', value: settings.pickupEnabled ? 'פעיל' : 'מושהה', active: settings.pickupEnabled, icon: Storefront },
  ];

  return (
    <div className="page-stack dashboard-page">
      <header className="page-header dashboard-header">
        <div className="dashboard-header__title"><p className="eyebrow">ניהול שוטף</p><h1>דשבורד</h1></div>
        <BakeryLiveClock />
        <div className="last-updated"><ClockCounterClockwise size={19} /><span>הגדרות עודכנו<br /><strong>{settings.updatedAt}</strong></span></div>
      </header>

      <section className="status-board" aria-labelledby="store-status-title">
        <div className="status-board__head">
          <div><p className="eyebrow eyebrow--light">סטטוס החנות</p><h2 id="store-status-title">{settings.orderingEnabled ? 'החנות פתוחה להזמנות' : 'ההזמנות סגורות כרגע'}</h2></div>
          <span className={`live-pill ${settings.orderingEnabled ? 'is-live' : 'is-paused'}`}><span />{settings.orderingEnabled ? 'פתוח ללקוחות' : 'סגור ללקוחות'}</span>
        </div>
        <div className="status-board__items">
          {statuses.map((status) => {
            const Icon = status.icon;
            return <div className="status-item" key={status.label}><span className="status-item__icon"><Icon size={23} weight="duotone" /></span><div><small>{status.label}</small><strong>{status.value}</strong></div><CheckCircle className={status.active ? 'is-positive' : 'is-muted'} size={20} weight={status.active ? 'fill' : 'regular'} /></div>;
          })}
        </div>
      </section>

      <div className="overview-grid">
        <section className="notice-panel">
          <div className="section-title-row"><div><p className="eyebrow">הודעה ללקוחות</p><h2>{settings.noticeActive ? 'הודעה פעילה בחנות' : 'אין הודעה פעילה'}</h2></div><BellRinging size={25} weight="duotone" /></div>
          {settings.noticeActive ? <blockquote>{settings.noticeText}</blockquote> : <p className="muted-copy">אפשר לפרסם עדכון קצר על עומס, משלוחים או סגירת הזמנות.</p>}
          <button className="text-action" type="button" onClick={onEditNotice}><PencilSimple size={17} /> עריכת ההודעה</button>
        </section>

        <section className="inventory-panel">
          <div className="section-title-row"><div><p className="eyebrow">מלאי היום</p><h2>זמינות מוצרים</h2></div><Package size={25} weight="duotone" /></div>
          <div className="inventory-counts">
            <div><strong>{availableCount}</strong><span>מוצרים זמינים</span></div>
            <div className="is-warning"><strong>{unavailableCount}</strong><span>אזלו להיום</span></div>
          </div>
          <p className="muted-copy">הנתונים נטענים ממסד המאפייה ומתעדכנים לאחר כל שמירה מאומתת.</p>
        </section>
      </div>

      <section className="quick-actions" aria-labelledby="quick-actions-title">
        <div className="quick-actions__head">
          <div><p className="eyebrow">שליטה שוטפת</p><h2 id="quick-actions-title">פעולות מהירות</h2></div>
          <p>כל מצב מוצג באופן קבוע ומתעדכן מיד לאחר השינוי.</p>
        </div>
        <div className="quick-control-grid">
          <QuickControl label="הזמנות אונליין" activeLabel="פתוחות" inactiveLabel="סגורות" active={settings.orderingEnabled} icon={ShoppingBagOpen} onToggle={onToggleOrdering} saving={savingControl === 'ordering'} disabled={savingControl !== null} />
          <QuickControl label="משלוחים" activeLabel="פעילים" inactiveLabel="מושהים" active={settings.deliveryEnabled} icon={Truck} onToggle={onToggleDelivery} saving={savingControl === 'delivery'} disabled={savingControl !== null} />
          <QuickControl label="איסוף עצמי" activeLabel="פעיל" inactiveLabel="מושהה" active={settings.pickupEnabled} icon={Storefront} onToggle={onTogglePickup} saving={savingControl === 'pickup'} disabled={savingControl !== null} />
          <QuickControl label="הודעה ללקוחות" activeLabel="פעילה" inactiveLabel="לא פעילה" active={settings.noticeActive} icon={BellRinging} onToggle={onToggleNotice} onEdit={onEditNotice} saving={savingControl === 'notice'} disabled={savingControl !== null} />
        </div>
      </section>
    </div>
  );
}
