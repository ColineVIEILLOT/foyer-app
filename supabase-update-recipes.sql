alter table recipes add column prep_time_minutes integer;
alter table recipes add column cook_time_minutes integer;
alter table recipes add column photo_url text;

alter table recipes alter column ingredients type jsonb using (
  coalesce(
    (select jsonb_agg(jsonb_build_object('name', elem, 'category', 'Autre'))
     from unnest(ingredients) as elem),
    '[]'::jsonb
  )
);

alter table recipes alter column ingredients set default '[]'::jsonb;
