# Bakery public catalog contract

Verified: 2026-07-12

This document defines the public-safe catalog shape prepared by Stage C.0 and consumed by the Stage C `/shop` connection. Supabase is authoritative at runtime; the approved JSON remains a reproducible reference and browse-only failure fallback.

## Source classification

The approved `product-catalog-yachad.json` contains 78 products and 10 categories. Twelve source records were previously marked `has_options = true`, but the executable contract is based only on complete structured `option_groups` data.

### Executable option product

- `salads-01` — `סלט ירקות בהרכבה`
  - 2 active groups
  - 24 active options
  - 16 free ingredients
  - 4 additions at 300 agorot
  - 4 sauces at 200 agorot

### Genuine option evidence pending owner confirmation

These products contain an unstructured `options_summary`, but no approved structured groups or selection bounds. They remain ordinary products until a later owner-approved contract is supplied:

- `pizza-sambusak-01` — `פיצה אישית`
- `pizza-sambusak-02` — `פיצה משפחתית + תוספת`
- `pizza-sambusak-03` — `פיצה פסטו אישית`
- `sandwiches-toasts-06` — `טוסט בהרכבה`

No groups or options were invented from their prose summaries.

### Source-flag false positives

These products have no structured groups and no option summary. The phrase `ללא תוספת סוכר` caused the old source flag to be misleading, so their executable `has_options` value is false:

- `cakes-03`
- `cakes-07`
- `cakes-13`
- `cookies-05`
- `cookies-07`
- `cookies-08`
- `cookies-09`

## Normalized option contract

`product_option_groups.code` and `product_options.code` are deterministic technical source keys based on approved source order: `group-01`, `group-02` and `option-01` onward within each group. Customer-facing Hebrew names remain exact source values.

`max_select = NULL` means no explicit maximum. It never overrides `min_select`; the required salad ingredient group still requires at least one selection.

All option money is stored in `price_delta_agorot` as a nonnegative integer. Free options use zero.

## Public-safe product text

`products.display_price_text` and `products.price_unit_note` are copied exactly from the approved source payload. Empty values become `NULL`. Live calculations and future checkout validation must always use `price_agorot`; `display_price_text` is presentation metadata and must not override the authoritative numeric price.

`product_source_metadata` remains closed to anonymous and authenticated browser clients.

## Realtime scope

Stage C.0 adds only these tables to `supabase_realtime`:

- `public.products`
- `public.store_settings`

Categories and option data are structural and will be fetched normally. Admin authorization, audit history and source metadata are never part of the public Realtime publication.

The public client treats Realtime payloads as invalidation signals and refetches a complete snapshot. It also refetches on focus, reconnect, checkout entry and immediately before WhatsApp submission.
