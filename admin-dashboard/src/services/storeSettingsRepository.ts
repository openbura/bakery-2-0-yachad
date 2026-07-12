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

export async function fetchStoreSettings() {
  const { data, error } = await getSupabaseClient()
    .from('store_settings')
    .select(settingsColumns)
    .eq('id', 'default')
    .single();
  if (error || !data) throw new OwnerFacingError('לא הצלחנו לטעון את הגדרות החנות.');
  return mapSettings(data);
}

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

export async function updateStoreSettings(patch: StoreSettingsPatch) {
  const databasePatch = toDatabasePatch(patch);
  const { data, error } = await getSupabaseClient()
    .from('store_settings')
    .update(databasePatch)
    .eq('id', 'default')
    .select('id')
    .single();
  if (error || !data) throw new OwnerFacingError('הגדרות החנות לא נשמרו. בדקו את החיבור ונסו שוב.');
  return fetchStoreSettings();
}
