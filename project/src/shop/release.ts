// Online ordering is opt-in for a verified release. Missing configuration keeps
// the public catalogue/cart available without collecting customer details.
export const ownerReviewEnabled = import.meta.env.VITE_BAKERY_OWNER_REVIEW === 'true';
export const whatsappOrdersEnabled = import.meta.env.VITE_BAKERY_WHATSAPP_ORDERS === 'true';
export const onlineOrdersEnabled = !ownerReviewEnabled && import.meta.env.VITE_BAKERY_ONLINE_ORDERS_ENABLED === 'true';
export const customerOrdersEnabled = onlineOrdersEnabled || whatsappOrdersEnabled;
export const ordersOpeningMessage = 'הזמנות אונליין ייפתחו בקרוב. בינתיים אפשר לעיין בתפריט ולהרכיב סל, ללא שליחת הזמנה או חיוב.';
