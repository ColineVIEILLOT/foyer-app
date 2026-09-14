create table shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  quantity text,
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table shopping_items enable row level security;
