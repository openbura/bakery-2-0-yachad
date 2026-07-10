import { BellRinging, FloppyDisk, Info, Storefront, Truck, WarningCircle } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Toggle } from '../components/Toggle';
import type { NoticeType, StoreSettings } from '../types/dashboard';

type SettingsPageProps = {
  settings: StoreSettings;
  onSave: (settings: StoreSettings) => void;
};

const noticeOptions: Array<{ value: NoticeType; label: string; description: string }> = [
  { value: 'information', label: 'מידע', description: 'עדכון כללי ללקוחות' },
  { value: 'warning', label: 'אזהרה', description: 'עומס או שינוי זמני' },
  { value: 'closed', label: 'החנות סגורה', description: 'הזמנות אינן מתקבלות' },
];

export function SettingsPage({ settings, onSave }: SettingsPageProps) {
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);
  const invalidAvailability = draft.orderingEnabled && !draft.deliveryEnabled && !draft.pickupEnabled;
  const invalidNotice = draft.noticeActive && draft.noticeText.trim().length < 5;

  const save = () => {
    if (!dirty || invalidAvailability || invalidNotice) return;
    setSaving(true);
    window.setTimeout(() => {
      const savedSettings = { ...draft, updatedAt: 'עכשיו' };
      setDraft(savedSettings);
      onSave(savedSettings);
      setSaving(false);
    }, 520);
  };

  return (
    <div className="page-stack settings-page">
      <header className="page-header">
        <div><p className="eyebrow">הגדרות החנות</p><h1>שליטה במה שהלקוחות רואים</h1><p>פתיחה, אמצעי קבלה והודעה זמנית — הכל במקום אחד.</p></div>
        <span className={`save-state ${dirty ? 'is-dirty' : ''}`}>{dirty ? 'יש שינויים שלא נשמרו' : 'כל השינויים שמורים'}</span>
      </header>

      <div className="settings-layout">
        <div className="settings-main">
          <section className="settings-section">
            <div className="settings-section__head"><span><Storefront size={24} weight="duotone" /></span><div><p className="eyebrow">פעילות החנות</p><h2>הזמנות ואמצעי קבלה</h2></div></div>
            <div className="settings-controls">
              <Toggle checked={draft.orderingEnabled} onChange={(value) => setDraft((current) => ({ ...current, orderingEnabled: value }))} label="הזמנות פתוחות" description="כאשר סגור, הקטלוג נשאר גלוי אך אי אפשר להזמין" />
              <Toggle checked={draft.deliveryEnabled} onChange={(value) => setDraft((current) => ({ ...current, deliveryEnabled: value }))} label="משלוחים פעילים" description="ניתן להשהות משלוחים ולהשאיר איסוף עצמי פעיל" />
              <Toggle checked={draft.pickupEnabled} onChange={(value) => setDraft((current) => ({ ...current, pickupEnabled: value }))} label="איסוף עצמי פעיל" description="שליטה נפרדת מאפשרות המשלוח" />
            </div>
            {invalidAvailability && <div className="validation-note" role="alert"><WarningCircle size={20} weight="fill" /><span>כדי להשאיר הזמנות פתוחות, לפחות משלוח או איסוף עצמי חייבים להיות פעילים.</span></div>}
          </section>

          <section className="settings-section">
            <div className="settings-section__head"><span><BellRinging size={24} weight="duotone" /></span><div><p className="eyebrow">הודעה ללקוחות</p><h2>עדכון זמני בראש החנות</h2></div></div>
            <Toggle checked={draft.noticeActive} onChange={(value) => setDraft((current) => ({ ...current, noticeActive: value }))} label="ההודעה פעילה" description="ההודעה תופיע באופן בולט בכניסה לחנות" />

            <fieldset className="notice-types" disabled={!draft.noticeActive}>
              <legend>סוג ההודעה</legend>
              {noticeOptions.map((option) => <label className={draft.noticeType === option.value ? 'is-selected' : ''} key={option.value}><input type="radio" name="notice-type" value={option.value} checked={draft.noticeType === option.value} onChange={() => setDraft((current) => ({ ...current, noticeType: option.value }))} /><span><strong>{option.label}</strong><small>{option.description}</small></span></label>)}
            </fieldset>

            <label className="textarea-field" htmlFor="customer-notice"><span>תוכן ההודעה</span><textarea id="customer-notice" value={draft.noticeText} onChange={(event) => setDraft((current) => ({ ...current, noticeText: event.target.value }))} disabled={!draft.noticeActive} maxLength={160} rows={4} /><small><bdi dir="ltr">{draft.noticeText.length}/160</bdi></small></label>
            {invalidNotice && <div className="field-message field-message--error">יש לכתוב הודעה ברורה באורך של לפחות 5 תווים.</div>}
          </section>
        </div>

        <aside className="settings-preview" aria-label="תצוגה מקדימה">
          <p className="eyebrow">תצוגה מקדימה</p><h2>כך זה ייראה ללקוחות</h2>
          <div className="customer-preview">
            <div className="customer-preview__bar"><span>מאפיית יחד</span><small>הזמנה אונליין</small></div>
            {draft.noticeActive ? <div className={`customer-notice customer-notice--${draft.noticeType}`}>{draft.noticeType === 'information' ? <Info size={20} weight="fill" /> : <WarningCircle size={20} weight="fill" />}<span>{draft.noticeText || 'תוכן ההודעה יופיע כאן'}</span></div> : <div className="customer-notice is-empty">אין הודעה פעילה</div>}
            <div className="preview-statuses"><span className={draft.deliveryEnabled ? 'is-on' : ''}><Truck size={18} /> משלוחים</span><span className={draft.pickupEnabled ? 'is-on' : ''}><Storefront size={18} /> איסוף עצמי</span></div>
          </div>
          <p className="mock-note">זוהי הדגמה מקומית בלבד. האתר הציבורי לא משתנה.</p>
        </aside>
      </div>

      <div className="sticky-save-bar"><div><strong>{dirty ? 'יש שינויים שממתינים לשמירה' : 'ההגדרות מעודכנות'}</strong><small>{dirty ? 'בדקו את התצוגה המקדימה לפני השמירה' : `עודכן ${settings.updatedAt}`}</small></div><button className="button button--primary" type="button" disabled={!dirty || invalidAvailability || invalidNotice || saving} onClick={save}>{saving ? <><span className="spinner" /> שומר…</> : <><FloppyDisk size={19} /> שמירת שינויים</>}</button></div>
    </div>
  );
}
