create table recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  ingredients text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table recipes enable row level security;
