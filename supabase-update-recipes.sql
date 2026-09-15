alter table recipes add column if not exists prep_time_minutes integer;
alter table recipes add column if not exists cook_time_minutes integer;
alter table recipes add column if not exists photo_url text;

alter table recipes add column if not exists ingredients_jsonb jsonb not null default '[]'::jsonb;

update recipes
set ingredients_jsonb = coalesce(
  (select jsonb_agg(jsonb_build_object('name', elem, 'category', 'Autre'))
   from unnest(ingredients) as elem),
  '[]'::jsonb
)
where jsonb_typeof(ingredients_jsonb) is null or ingredients_jsonb = '[]'::jsonb;

alter table recipes drop column if exists ingredients;
alter table recipes rename column ingredients_jsonb to ingredients;
