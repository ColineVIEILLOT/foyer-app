create table events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  event_date date not null,
  event_time time,
  notes text,
  created_at timestamptz not null default now()
);

alter table events enable row level security;
