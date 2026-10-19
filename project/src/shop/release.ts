// Online ordering is opt-in for a verified release. Missing configuration keeps
// the public catalogue/cart available without collecting customer details.
export const onlineOrdersEnabled = import.meta.env.VITE_BAKERY_ONLINE_ORDERS_ENABLED === 'true';
export const ordersOpeningMessage = 'הזמנות אונליין ייפתחו בקרוב. בינתיים אפשר לעיין בתפריט ולהרכיב סל, ללא שליחת הזמנה או חיוב.';
