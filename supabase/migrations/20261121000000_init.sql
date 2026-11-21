-- Beekey Medics — initial database schema (Supabase / plain Postgres 15+).
--
-- Every table keeps the app's record exactly as the front end uses it in a `data` jsonb column,
-- plus a few real columns (role, status, phone, rider…) for filtering and indexes.
-- This runs unchanged on Supabase cloud or a self-hosted Supabase / Postgres on Ubuntu.

create extension if not exists pgcrypto;

-- updated_at bookkeeping -------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Partners: doctors, labs, medical shops and delivery riders (managed in the admin console)
create table public.partners (
  id          text primary key,
  role        text not null check (role in ('doctor', 'lab', 'shop', 'delivery')),
  status      text generated always as (data->>'status') stored,
  city        text generated always as (coalesce(data->>'city', 'kochi')) stored,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index partners_role_status on public.partners (role, status);

-- Customers (keyed by their 10-digit mobile number)
create table public.customers (
  id          text primary key,            -- the phone number
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Medicine orders
create table public.orders (
  id          text primary key,
  user_id     text generated always as (data->>'userId') stored,
  shop_id     text generated always as (data->>'shopId') stored,
  rider_id    text generated always as (data->>'riderId') stored,
  status      text generated always as (data->>'status') stored,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index orders_user on public.orders (user_id);
create index orders_shop on public.orders (shop_id, status);
create index orders_rider on public.orders (rider_id, status);

-- Doctor consultations
create table public.appointments (
  id          text primary key,
  user_id     text generated always as (data->>'userId') stored,
  doctor_id   text generated always as (data->>'doctorId') stored,
  status      text generated always as (data->>'status') stored,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index appointments_doctor on public.appointments (doctor_id, status);

-- Lab test bookings
create table public.lab_bookings (
  id          text primary key,
  user_id     text generated always as (data->>'userId') stored,
  lab_id      text generated always as (data->>'labId') stored,
  status      text generated always as (data->>'status') stored,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index lab_bookings_lab on public.lab_bookings (lab_id, status);

-- "Apply to join" requests from would-be partners
create table public.applications (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Patient reviews of doctors, labs and pharmacies
create table public.reviews (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Prescriptions uploaded from the home page
create table public.rx_uploads (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Live GPS of delivery partners (one row per rider, overwritten with each fix)
create table public.rider_locations (
  rider_id    text primary key,
  data        jsonb not null,              -- { lat, lng, x, y, acc, kmh, heading, at }
  updated_at  timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['partners','customers','orders','appointments','lab_bookings','applications','reviews','rx_uploads','rider_locations'] loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
    execute format('alter table public.%I enable row level security', t);
    -- ⚠️ TESTING POLICY: anyone with the app's public (anon) key can read and write.
    -- Fine for the client-testing phase with sample data. Before real patients use the app,
    -- replace these with per-user policies once phone-OTP login (Supabase Auth) is switched on.
    execute format('create policy "testing: open read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "testing: open insert" on public.%I for insert to anon, authenticated with check (true)', t);
    execute format('create policy "testing: open update" on public.%I for update to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Live updates to every open app (order status, partner changes, rider GPS)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.partners, public.customers, public.orders, public.appointments, public.lab_bookings,
      public.applications, public.reviews, public.rx_uploads, public.rider_locations;
  end if;
end $$;
