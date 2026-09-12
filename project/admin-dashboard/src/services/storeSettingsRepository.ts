import { getSupabaseClient } from '../lib/supabaseClient';
import type { NoticeType, StoreSettings } from '../types/dashboard';
import type { StoreSettingsRow } from '../types/database';
import { OwnerFacingError } from './serviceErrors';

const settingsColumns = 'id, ordering_enabled, delivery_enabled, pickup_enabled, customer_notice_active, customer_notice_type, customer_notice_text, customer_notice_start_at, customer_notice_end_at, updated_at';

export type StoreSettingsPatch = Partial<Pick<StoreSettings,
  | 'orderingEnabled'
  | 'deliveryEnabled'
  | 'pickupEnabled'
  | 'noticeActive'
  | 'noticeType'
  | 'noticeText'
  | 'noticeStartAt'
  | 'noticeEndAt'
>>;

export function normalizeNoticeType(value: unknown): NoticeType {
  if (value === 'information') return 'info';
  if (value === 'info' || value === 'warning' || value === 'closed') return value;
  return 'info';
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value));
}

function mapSettings(row: Pick<StoreSettingsRow,
  | 'ordering_enabled'
  | 'delivery_enabled'
  | 'pickup_enabled'
  | 'customer_notice_active'
  | 'customer_notice_type'
  | 'customer_notice_text'
  | 'customer_notice_start_at'
  | 'customer_notice_end_at'
  | 'updated_at'
>): StoreSettings {
  return {
    orderingEnabled: row.ordering_enabled,
    deliveryEnabled: row.delivery_enabled,
    pickupEnabled: row.pickup_enabled,
    noticeActive: row.customer_notice_active,
    noticeType: normalizeNoticeType(row.customer_notice_type),
    noticeText: row.customer_notice_text,
    noticeStartAt: row.customer_notice_start_at,
    noticeEndAt: row.customer_notice_end_at,
    updatedAt: formatUpdatedAt(row.updated_at),
  };
}

async function fetchSettingsRow() {
  const { data, error } = await getSupabaseClient()
    .from('store_settings')
    .select(settingsColumns)
    .eq('id', 'default')
    .single();
  if (error || !data) throw new OwnerFacingError('לא הצלחנו לטעון את הגדרות החנות.');
  return data;
}

export async function fetchStoreSettings() { return mapSettings(await fetchSettingsRow()); }

function toDatabasePatch(patch: StoreSettingsPatch): Partial<Pick<StoreSettingsRow,
  | 'ordering_enabled'
  | 'delivery_enabled'
  | 'pickup_enabled'
  | 'customer_notice_active'
  | 'customer_notice_type'
  | 'customer_notice_text'
  | 'customer_notice_start_at'
  | 'customer_notice_end_at'
>> {
  const databasePatch: Record<string, boolean | string | null> = {};
  if (patch.orderingEnabled !== undefined) databasePatch.ordering_enabled = patch.orderingEnabled;
  if (patch.deliveryEnabled !== undefined) databasePatch.delivery_enabled = patch.deliveryEnabled;
  if (patch.pickupEnabled !== undefined) databasePatch.pickup_enabled = patch.pickupEnabled;
  if (patch.noticeActive !== undefined) databasePatch.customer_notice_active = patch.noticeActive;
  if (patch.noticeType !== undefined) databasePatch.customer_notice_type = normalizeNoticeType(patch.noticeType);
  if (patch.noticeText !== undefined) databasePatch.customer_notice_text = patch.noticeText;
  if (patch.noticeStartAt !== undefined) databasePatch.customer_notice_start_at = patch.noticeStartAt;
  if (patch.noticeEndAt !== undefined) databasePatch.customer_notice_end_at = patch.noticeEndAt;
  return databasePatch;
}

const editableKeys = ['orderingEnabled', 'deliveryEnabled', 'pickupEnabled', 'noticeActive', 'noticeType', 'noticeText', 'noticeStartAt', 'noticeEndAt'] as const;
export function settingsDiff(baseline: StoreSettings, draft: StoreSettings): StoreSettingsPatch {
  return Object.fromEntries(editableKeys.filter(key => baseline[key] !== draft[key]).map(key => [key, draft[key]]));
}
export async function updateStoreSettings(patch: StoreSettingsPatch) {
  const databasePatch = toDatabasePatch(patch);
  // Raw DB timestamp is an optimistic lock; the UI timestamp is display-only.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await fetchSettingsRow();
    if (!Object.keys(databasePatch).length) return mapSettings(current);
    const merged = { ...current, ...databasePatch };
    if (merged.ordering_enabled && !merged.delivery_enabled && !merged.pickup_enabled) {
      throw new OwnerFacingError('כדי להשאיר הזמנות פתוחות, לפחות משלוח או איסוף עצמי חייבים להיות פעילים.');
    }
    if (merged.customer_notice_active && merged.customer_notice_text.trim().length < 5) {
      throw new OwnerFacingError('יש לכתוב הודעה ברורה באורך של לפחות 5 תווים לפני הפעלתה.');
    }
    const { data, error } = await getSupabaseClient()
      .from('store_settings')
      .update(databasePatch)
      .eq('id', 'default')
      .eq('updated_at', current.updated_at)
      .select('id')
      .maybeSingle();
    if (error) throw new OwnerFacingError('הגדרות החנות לא נשמרו. בדקו את החיבור ונסו שוב.');
    if (!data) continue; // Another admin wrote first: re-read and revalidate, never send stale fields.
    const verified = await fetchSettingsRow();
    if (Object.entries(databasePatch).some(([key, value]) => verified[key as keyof typeof verified] !== value)) {
      throw new OwnerFacingError('לא הצלחנו לאמת את השינוי: ההגדרות השתנו שוב. רעננו ובדקו את הערכים.');
    }
    return mapSettings(verified);
  }
  throw new OwnerFacingError('מנהל אחר עדכן את ההגדרות במקביל. השינויים נשארו בטופס; נסו לשמור שוב.');
}
