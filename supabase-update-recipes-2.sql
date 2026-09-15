alter table recipes add column if not exists steps text;

alter table shopping_items add column if not exists category text;
alter table shopping_items add column if not exists recipe_name text;

create table if not exists menu_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  day text not null,
  recipe_id uuid references recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (household_id, day)
);

alter table menu_entries enable row level security;
