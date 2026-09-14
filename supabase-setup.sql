create table households (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table households enable row level security;
