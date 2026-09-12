begin;

alter table public.products
  add column display_price_text text,
  add column price_unit_note text;

alter table public.product_option_groups
  drop constraint product_option_groups_selection_bounds,
  alter column max_select drop not null;

alter table public.product_option_groups
  add constraint product_option_groups_selection_bounds check (
    min_select >= 0
    and (
      max_select is null
      or (max_select >= 1 and max_select >= min_select)
    )
  );

alter table public.product_options
  rename column price_delta_ils to price_delta_agorot;

alter table public.product_options
  alter column price_delta_agorot type integer
    using round(price_delta_agorot * 100)::integer,
  alter column price_delta_agorot set default 0,
  add constraint product_options_price_delta_nonnegative
    check (price_delta_agorot >= 0);

-- Preserve the Stage B.3 least-privilege model explicitly. The new public-safe
-- fields are readable through the existing product SELECT policy but are never
-- browser-editable.
revoke update (display_price_text, price_unit_note)
on public.products
from authenticated;

revoke insert, update, delete
on public.product_option_groups, public.product_options
from anon, authenticated;

grant select
on public.product_option_groups, public.product_options
to anon, authenticated;

comment on column public.products.display_price_text is
  'Public-safe source display text. Live ordering calculations must use price_agorot as the authority.';

comment on column public.products.price_unit_note is
  'Public-safe source unit or weight price note copied verbatim from the approved catalog.';

comment on column public.product_option_groups.max_select is
  'NULL means no explicit maximum. min_select remains mandatory and is still enforced.';

comment on column public.product_options.price_delta_agorot is
  'Option price delta in integer agorot. Zero is a free option.';

commit;
