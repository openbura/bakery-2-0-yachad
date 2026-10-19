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
  price_unit_note: string | null;
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

export type OrderRow = {
  id: string;
  order_number: number;
  status: string;
  payment_status: string;
  fulfillment_type: 'pickup' | 'delivery';
  requested_pickup_at: string | null;
  promised_by: string | null;
  customer_name: string;
  phone_e164: string;
  delivery_address: Json | null;
  customer_notes: string;
  subtotal_agorot: number;
  fulfillment_fee_agorot: number;
  total_agorot: number;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name_he: string;
  quantity: number;
  unit_base_price_agorot: number;
  unit_total_agorot: number;
  line_total_agorot: number;
  created_at: string;
};

export type OrderItemOptionRow = {
  id: string;
  order_item_id: string;
  group_id: string | null;
  option_id: string | null;
  group_name_he: string;
  option_name_he: string;
  price_delta_agorot: number;
  sort_order: number;
  created_at: string;
};

export type OrderStatusHistoryRow = {
  id: number;
  order_id: string;
  from_status: string | null;
  to_status: string;
  actor_type: 'customer' | 'admin' | 'system';
  actor_user_id: string | null;
  reason: string | null;
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
      orders: Table<OrderRow, never, never>;
      order_items: Table<OrderItemRow, never, never>;
      order_item_options: Table<OrderItemOptionRow, never, never>;
      order_status_history: Table<OrderStatusHistoryRow, never, never>;
    };
    Views: Record<string, never>;
    Functions: {
      acknowledge_bakery_order: {
        Args: { p_order_id: string };
        Returns: { order_id: string; acknowledged_at: string; acknowledged_by: string };
      };
      get_bakery_order_attention: {
        Args: { p_after_number?: number; p_limit?: number };
        Returns: Array<{ id: string; order_number: number; customer_name: string; fulfillment_type: string; total_agorot: number; created_at: string }>;
      };
      transition_bakery_order: {
        Args: { p_order_id: string; p_expected_updated_at: string; p_to_status: string; p_reason?: string | null };
        Returns: OrderRow;
      };
      get_admin_pickup_slots: {
        Args: { p_days?: number };
        Returns: Array<{ starts_at: string; capacity: number; reserved: number; enabled: boolean }>;
      };
      set_pickup_slot_override: {
        Args: { p_starts_at: string; p_enabled: boolean; p_capacity?: number | null };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
