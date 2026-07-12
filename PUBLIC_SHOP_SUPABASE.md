# Public shop Supabase integration

Verified locally: 2026-07-12

The public `/shop` now treats the dedicated Bakery Supabase project as its live source of truth. The homepage, cinematic intro and the separate `admin-dashboard` application remain independent.

## Browser configuration

The root Vite application expects these browser-safe variables:

```text
VITE_BAKERY_SUPABASE_URL=
VITE_BAKERY_SUPABASE_PUBLISHABLE_KEY=
```

Real values belong only in the ignored root `.env.local`. The client rejects missing configuration, secret/service-role keys, malformed URLs and every hostname other than `utyzqpjjjwjkkdlepkag.supabase.co`.

## Runtime architecture

- `src/lib/bakerySupabaseClient.ts`: guarded anonymous browser client with no public Auth session.
- `src/services/publicShopRepository.ts`: coherent read of 10 categories, 78 products, 2 option groups, 24 options and the singleton store settings row.
- `src/hooks/usePublicShop.ts`: initial load, retry, focus/online refetch and scoped Realtime invalidation for `products` and `store_settings`.
- `src/shop/cartReconciliation.ts`: matches cart products and selected option codes against each authoritative snapshot, updates integer-agorot prices and marks invalid items without deleting them.
- `src/ShopPage.tsx`: preserves the existing layout, checkout and WhatsApp flow while applying operational states and fresh validation.

Money uses integer agorot until the formatting boundary. `display_price_text` remains presentation metadata; `price_agorot` is authoritative after an admin price change.

## Failure and ordering safety

If configuration or the initial live read fails, the local JSON catalog is shown only for browsing. Adding products, checkout, copying an order and WhatsApp submission remain disabled until a complete live snapshot is loaded. A retry control is shown.

Immediately before opening WhatsApp, the shop refetches the full snapshot and validates:

- ordering, delivery and pickup status
- product activity and daily/fulfillment availability
- current base and option prices
- current option groups, active options and min/max rules
- delivery minimum and fulfillment fees

Material price or fee changes update the visible cart and require the customer to review and submit again. Unavailable or invalid cart items stay visible and must be removed or corrected. This prevents stale WhatsApp totals but does not reserve inventory or create a server-side order.

## Realtime and recovery

Realtime events are treated only as invalidation signals; the client refetches an authoritative snapshot instead of trusting partial payloads. Subscriptions are limited to `products` and `store_settings`, debounced and removed on unmount. Focus and network-reconnect events provide recovery if Realtime is interrupted.

## Production

The integration is deployed in the existing Vercel project `bakery-2-0-yachad-deploy`:

- https://bakery-2-0-yachad-deploy.vercel.app/
- https://bakery-2-0-yachad-deploy.vercel.app/shop

Both browser-safe variables are configured for Preview and Production. Preview and production smoke tests cover direct `/shop` refresh, 78 products, 10 categories, 2 option groups, 24 options, degraded-mode absence during healthy operation and the allowed Supabase hostname guard. Never add an admin login, service-role key or private table access to the public application.
