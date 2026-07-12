export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type AdminUserRow = {
  user_id: string;
  display_name: string;
  role: 'owner' | 'manager';
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  name_he: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  category_id: string;
  name_he: string;
  description_he: string;
  price_agorot: number;
  image_url: string;
  image_filename: string;
  active: boolean;
  available_for_delivery: boolean;
  available_for_pickup: boolean;
  available_today: boolean;
  sort_order: number;
  has_options: boolean;
  options_summary: string;
  owner_needs_to_confirm: boolean;
  created_at: string;
  updated_at: string;
};

export type StoreSettingsRow = {
  id: 'default';
  ordering_enabled: boolean;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  customer_notice_active: boolean;
  customer_notice_type: 'info' | 'warning' | 'closed';
  customer_notice_text: string;
  delivery_fee_agorot: number;
  minimum_delivery_subtotal_agorot: number;
  pickup_fee_agorot: number;
  customer_notice_start_at: string | null;
  customer_notice_end_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  entity_type: 'product' | 'store_settings';
  entity_id: string;
  action: string;
  previous_value: Json | null;
  new_value: Json | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      admin_users: Table<AdminUserRow, never, never>;
      categories: Table<CategoryRow, never, never>;
      products: Table<ProductRow, never, Partial<Pick<ProductRow, 'price_agorot' | 'available_today'>>>;
      store_settings: Table<StoreSettingsRow, never, Partial<Pick<StoreSettingsRow,
        | 'ordering_enabled'
        | 'delivery_enabled'
        | 'pickup_enabled'
        | 'customer_notice_active'
        | 'customer_notice_type'
        | 'customer_notice_text'
        | 'customer_notice_start_at'
        | 'customer_notice_end_at'
      >>>;
      audit_log: Table<AuditLogRow, never, never>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
