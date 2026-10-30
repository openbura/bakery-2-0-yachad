-- Roll back only the five price fields changed by release20261030.
-- Stop if any target record changed after the release.
BEGIN;
SELECT id FROM public.products WHERE id IN ('drinks-02', 'drinks-03', 'drinks-04', 'drinks-05', 'drinks-06') FOR UPDATE;
DO $rollback_guard$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.products WHERE id='drinks-02' AND price_agorot=1000 AND updated_at='2026-10-30T08:26:52.901608+00:00'::timestamptz) THEN RAISE EXCEPTION 'Product changed after release: drinks-02'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.products WHERE id='drinks-03' AND price_agorot=1000 AND updated_at='2026-10-30T08:26:52.901608+00:00'::timestamptz) THEN RAISE EXCEPTION 'Product changed after release: drinks-03'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.products WHERE id='drinks-04' AND price_agorot=1000 AND updated_at='2026-10-30T08:26:52.901608+00:00'::timestamptz) THEN RAISE EXCEPTION 'Product changed after release: drinks-04'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.products WHERE id='drinks-05' AND price_agorot=1000 AND updated_at='2026-10-30T08:26:52.901608+00:00'::timestamptz) THEN RAISE EXCEPTION 'Product changed after release: drinks-05'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.products WHERE id='drinks-06' AND price_agorot=1000 AND updated_at='2026-10-30T08:26:52.901608+00:00'::timestamptz) THEN RAISE EXCEPTION 'Product changed after release: drinks-06'; END IF;
END $rollback_guard$;
UPDATE public.products SET price_agorot=1200, display_price_text='₪12', price_unit_note='₪3.64 / 100 מל׳' WHERE id='drinks-02';
UPDATE public.products SET price_agorot=1200, display_price_text='₪12', price_unit_note='₪3.64 / 100 מל׳' WHERE id='drinks-03';
UPDATE public.products SET price_agorot=1200, display_price_text='₪12', price_unit_note='₪3.64 / 100 מל׳' WHERE id='drinks-04';
UPDATE public.products SET price_agorot=1200, display_price_text='₪12', price_unit_note='₪3.64 / 100 מל׳' WHERE id='drinks-05';
UPDATE public.products SET price_agorot=1200, display_price_text='₪12', price_unit_note='₪3.64 / 100 מל׳' WHERE id='drinks-06';
COMMIT;
