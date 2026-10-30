-- Prepared only; not applied. Target: bakery utyzqpjjjwjkkdlepkag.
BEGIN;
SELECT id FROM public.products WHERE id IN ('drinks-02', 'drinks-03', 'drinks-04', 'drinks-05', 'drinks-06') FOR UPDATE;
DO $price_guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = 'drinks-02' AND price_agorot = 1200 AND updated_at = '2026-10-28T21:07:12.887168+00:00'::timestamptz) THEN RAISE EXCEPTION 'Product changed since backup: drinks-02'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = 'drinks-03' AND price_agorot = 1200 AND updated_at = '2026-10-28T21:07:12.887168+00:00'::timestamptz) THEN RAISE EXCEPTION 'Product changed since backup: drinks-03'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = 'drinks-04' AND price_agorot = 1200 AND updated_at = '2026-10-28T21:07:12.887168+00:00'::timestamptz) THEN RAISE EXCEPTION 'Product changed since backup: drinks-04'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = 'drinks-05' AND price_agorot = 1200 AND updated_at = '2026-10-28T21:07:12.887168+00:00'::timestamptz) THEN RAISE EXCEPTION 'Product changed since backup: drinks-05'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = 'drinks-06' AND price_agorot = 1200 AND updated_at = '2026-10-28T21:07:12.887168+00:00'::timestamptz) THEN RAISE EXCEPTION 'Product changed since backup: drinks-06'; END IF;
END $price_guard$;
UPDATE public.products SET price_agorot = 1000, display_price_text = '₪10', price_unit_note = 'מחיר לפריט' WHERE id IN ('drinks-02', 'drinks-03', 'drinks-04', 'drinks-05', 'drinks-06');
COMMIT;
SELECT id, name_he, price_agorot, display_price_text, price_unit_note FROM public.products WHERE id IN ('drinks-02', 'drinks-03', 'drinks-04', 'drinks-05', 'drinks-06');
