import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..', '..');
const catalogPath = resolve(repositoryRoot, 'product-catalog-yachad.json');
const seedPath = resolve(scriptDirectory, '..', 'seed.sql');

const categoryIds = new Map([
  ['בורקסים', 'bourekas'],
  ['פיצות וסמבוסק', 'pizza-sambusak'],
  ['סלטים', 'salads'],
  ['כריכים וטוסטים', 'sandwiches-toasts'],
  ['מתוקים', 'sweets'],
  ['לחמי מחמצת', 'sourdough-breads'],
  ['עוגות', 'cakes'],
  ['עוגיות', 'cookies'],
  ['לחמניות ובייגלים', 'rolls-bagels'],
  ['שתייה', 'drinks'],
]);

function sqlText(value) {
  return `'${String(value ?? '').replaceAll("'", "''")}'`;
}

function sqlNullableText(value) {
  const normalized = String(value ?? '').trim();
  return normalized ? sqlText(normalized) : 'null';
}

function sqlBoolean(value) {
  return value ? 'true' : 'false';
}

function sqlJson(value) {
  return `${sqlText(JSON.stringify(value))}::jsonb`;
}

const catalogSource = await readFile(catalogPath, 'utf8');
const catalog = JSON.parse(catalogSource);
const catalogHash = createHash('sha256').update(catalogSource).digest('hex');
const products = catalog.products ?? [];
const categoryNames = [...new Set(products.map((product) => product.category))];
const structuredOptionProducts = products.filter(
  (product) => Array.isArray(product.option_groups) && product.option_groups.length > 0,
);

if (products.length !== 78) throw new Error(`Expected 78 products, found ${products.length}.`);
if (categoryNames.length !== 10) throw new Error(`Expected 10 categories, found ${categoryNames.length}.`);
if (structuredOptionProducts.length !== 1 || structuredOptionProducts[0]?.id !== 'salads-01') {
  throw new Error('Expected salads-01 to be the only approved structured option product.');
}

for (const categoryName of categoryNames) {
  if (!categoryIds.has(categoryName)) throw new Error(`Missing stable category id for: ${categoryName}`);
}

const categoryRows = categoryNames.map((name, index) =>
  `  (${sqlText(categoryIds.get(name))}, ${sqlText(name)}, ${index + 1}, true)`,
);

const productRows = products.map((product) =>
  `  (${[
    sqlText(product.id),
    sqlText(categoryIds.get(product.category)),
    sqlText(product.product_name),
    sqlText(product.description),
    Math.round(Number(product.price_ils) * 100),
    sqlText(product.image_url),
    sqlText(product.image_filename),
    sqlBoolean(product.active),
    true,
    sqlBoolean(product.available_for_delivery),
    sqlBoolean(product.available_for_pickup),
    Number(product.sort_order),
    sqlBoolean(Array.isArray(product.option_groups) && product.option_groups.length > 0),
    sqlText(product.options_summary),
    sqlBoolean(product.owner_needs_to_confirm),
    sqlNullableText(product.display_price_text),
    sqlNullableText(product.price_unit_note),
  ].join(', ')})`,
);

const optionGroupRows = structuredOptionProducts.flatMap((product) =>
  product.option_groups.map((group, groupIndex) => {
    const required = group.required === true;
    const minSelect = Number.isInteger(group.min) ? group.min : required ? 1 : 0;
    const maxSelect = group.max == null ? 'null' : Number(group.max);

    if (!group.name?.trim()) throw new Error(`Missing option group name for ${product.id}.`);
    if (!Number.isInteger(minSelect) || minSelect < 0) throw new Error(`Invalid min_select for ${product.id}.`);
    if (maxSelect !== 'null' && (!Number.isInteger(maxSelect) || maxSelect < Math.max(1, minSelect))) {
      throw new Error(`Invalid max_select for ${product.id}.`);
    }
    if (!Array.isArray(group.options) || group.options.length === 0) {
      throw new Error(`Empty option group for ${product.id}.`);
    }

    return `  (${[
      sqlText(product.id),
      sqlText(`group-${String(groupIndex + 1).padStart(2, '0')}`),
      sqlText(group.name),
      groupIndex + 1,
      sqlBoolean(required),
      minSelect,
      maxSelect,
      'true',
    ].join(', ')})`;
  }),
);

const optionRows = structuredOptionProducts.flatMap((product) =>
  product.option_groups.flatMap((group, groupIndex) =>
    group.options.map((option, optionIndex) => {
      const priceDeltaAgorot = Math.round(Number(option.price_delta ?? 0) * 100);
      if (!option.name?.trim()) throw new Error(`Missing option name for ${product.id}.`);
      if (!Number.isSafeInteger(priceDeltaAgorot) || priceDeltaAgorot < 0) {
        throw new Error(`Invalid option price delta for ${product.id}: ${option.name}`);
      }

      return `  (${[
        sqlText(product.id),
        sqlText(`group-${String(groupIndex + 1).padStart(2, '0')}`),
        sqlText(`option-${String(optionIndex + 1).padStart(2, '0')}`),
        sqlText(option.name),
        priceDeltaAgorot,
        optionIndex + 1,
        sqlBoolean(option.active !== false),
      ].join(', ')})`;
    }),
  ),
);

if (optionGroupRows.length !== 2 || optionRows.length !== 24) {
  throw new Error(`Expected 2 option groups and 24 options, found ${optionGroupRows.length} and ${optionRows.length}.`);
}

const metadataRows = products.map((product) =>
  `  (${sqlText(product.id)}, ${sqlText(catalogHash)}, ${sqlJson(product)})`,
);

const seed = `-- Generated by supabase/scripts/generate-seed.mjs. Do not edit by hand.
-- Source: product-catalog-yachad.json
-- SHA-256: ${catalogHash}
-- Products: ${products.length}; categories: ${categoryNames.length}; option groups: ${optionGroupRows.length}; options: ${optionRows.length}

begin;

insert into public.categories (id, name_he, sort_order, active)
values
${categoryRows.join(',\n')}
on conflict (id) do update set
  name_he = excluded.name_he,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into public.products (
  id,
  category_id,
  name_he,
  description_he,
  price_agorot,
  image_url,
  image_filename,
  active,
  available_today,
  available_for_delivery,
  available_for_pickup,
  sort_order,
  has_options,
  options_summary,
  owner_needs_to_confirm,
  display_price_text,
  price_unit_note
)
values
${productRows.join(',\n')}
on conflict (id) do update set
  category_id = excluded.category_id,
  name_he = excluded.name_he,
  description_he = excluded.description_he,
  price_agorot = excluded.price_agorot,
  image_url = excluded.image_url,
  image_filename = excluded.image_filename,
  active = excluded.active,
  available_today = excluded.available_today,
  available_for_delivery = excluded.available_for_delivery,
  available_for_pickup = excluded.available_for_pickup,
  sort_order = excluded.sort_order,
  has_options = excluded.has_options,
  options_summary = excluded.options_summary,
  owner_needs_to_confirm = excluded.owner_needs_to_confirm,
  display_price_text = excluded.display_price_text,
  price_unit_note = excluded.price_unit_note
where (
  products.category_id,
  products.name_he,
  products.description_he,
  products.price_agorot,
  products.image_url,
  products.image_filename,
  products.active,
  products.available_today,
  products.available_for_delivery,
  products.available_for_pickup,
  products.sort_order,
  products.has_options,
  products.options_summary,
  products.owner_needs_to_confirm,
  products.display_price_text,
  products.price_unit_note
) is distinct from (
  excluded.category_id,
  excluded.name_he,
  excluded.description_he,
  excluded.price_agorot,
  excluded.image_url,
  excluded.image_filename,
  excluded.active,
  excluded.available_today,
  excluded.available_for_delivery,
  excluded.available_for_pickup,
  excluded.sort_order,
  excluded.has_options,
  excluded.options_summary,
  excluded.owner_needs_to_confirm,
  excluded.display_price_text,
  excluded.price_unit_note
);

insert into public.product_option_groups (
  product_id,
  code,
  name_he,
  sort_order,
  required,
  min_select,
  max_select,
  active
)
values
${optionGroupRows.join(',\n')}
on conflict (product_id, code) do update set
  name_he = excluded.name_he,
  sort_order = excluded.sort_order,
  required = excluded.required,
  min_select = excluded.min_select,
  max_select = excluded.max_select,
  active = excluded.active
where (
  product_option_groups.name_he,
  product_option_groups.sort_order,
  product_option_groups.required,
  product_option_groups.min_select,
  product_option_groups.max_select,
  product_option_groups.active
) is distinct from (
  excluded.name_he,
  excluded.sort_order,
  excluded.required,
  excluded.min_select,
  excluded.max_select,
  excluded.active
);

with option_source (
  product_id,
  group_code,
  option_code,
  name_he,
  price_delta_agorot,
  sort_order,
  active
) as (
  values
${optionRows.join(',\n')}
)
insert into public.product_options (
  group_id,
  code,
  name_he,
  price_delta_agorot,
  sort_order,
  active
)
select
  option_group.id,
  option_source.option_code,
  option_source.name_he,
  option_source.price_delta_agorot,
  option_source.sort_order,
  option_source.active
from option_source
join public.product_option_groups as option_group
  on option_group.product_id = option_source.product_id
 and option_group.code = option_source.group_code
on conflict (group_id, code) do update set
  name_he = excluded.name_he,
  price_delta_agorot = excluded.price_delta_agorot,
  sort_order = excluded.sort_order,
  active = excluded.active
where (
  product_options.name_he,
  product_options.price_delta_agorot,
  product_options.sort_order,
  product_options.active
) is distinct from (
  excluded.name_he,
  excluded.price_delta_agorot,
  excluded.sort_order,
  excluded.active
);

insert into public.product_source_metadata (product_id, catalog_sha256, source_payload)
values
${metadataRows.join(',\n')}
on conflict (product_id) do update set
  catalog_sha256 = excluded.catalog_sha256,
  source_payload = excluded.source_payload,
  imported_at = now()
where product_source_metadata.catalog_sha256 is distinct from excluded.catalog_sha256
   or product_source_metadata.source_payload is distinct from excluded.source_payload;

insert into public.store_settings (
  id,
  ordering_enabled,
  delivery_enabled,
  pickup_enabled,
  customer_notice_active,
  customer_notice_type,
  customer_notice_text,
  customer_notice_start_at,
  customer_notice_end_at,
  delivery_fee_agorot,
  minimum_delivery_subtotal_agorot,
  pickup_fee_agorot
)
values (
  'default',
  true,
  true,
  true,
  false,
  'info',
  '',
  null,
  null,
  1500,
  7000,
  0
)
on conflict (id) do update set
  ordering_enabled = excluded.ordering_enabled,
  delivery_enabled = excluded.delivery_enabled,
  pickup_enabled = excluded.pickup_enabled,
  customer_notice_active = excluded.customer_notice_active,
  customer_notice_type = excluded.customer_notice_type,
  customer_notice_text = excluded.customer_notice_text,
  customer_notice_start_at = excluded.customer_notice_start_at,
  customer_notice_end_at = excluded.customer_notice_end_at,
  delivery_fee_agorot = excluded.delivery_fee_agorot,
  minimum_delivery_subtotal_agorot = excluded.minimum_delivery_subtotal_agorot,
  pickup_fee_agorot = excluded.pickup_fee_agorot;

do $$
begin
  if (select count(*) from public.categories) <> 10 then
    raise exception 'Bakery seed expected 10 categories';
  end if;

  if (select count(*) from public.products) <> 78 then
    raise exception 'Bakery seed expected 78 products';
  end if;

  if (select count(*) from public.product_source_metadata) <> 78 then
    raise exception 'Bakery seed expected 78 source metadata records';
  end if;

  if (select count(*) from public.product_option_groups) <> 2 then
    raise exception 'Bakery seed expected 2 option groups';
  end if;

  if (select count(*) from public.product_options) <> 24 then
    raise exception 'Bakery seed expected 24 options';
  end if;

  if (select count(*) from public.products where has_options) <> 1 then
    raise exception 'Bakery seed expected one executable option product';
  end if;
end;
$$;

commit;
`;

if (process.argv.includes('--check')) {
  const currentSeed = await readFile(seedPath, 'utf8');
  if (currentSeed !== seed) {
    throw new Error('supabase/seed.sql is stale. Run: node supabase/scripts/generate-seed.mjs');
  }
  console.log(`Seed is current: ${products.length} products, ${categoryNames.length} categories, ${optionGroupRows.length} groups, ${optionRows.length} options, ${catalogHash}`);
} else {
  await writeFile(seedPath, seed, 'utf8');
  console.log(`Wrote ${seedPath}: ${products.length} products, ${categoryNames.length} categories, ${optionGroupRows.length} groups, ${optionRows.length} options, ${catalogHash}`);
}
