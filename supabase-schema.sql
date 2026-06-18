-- Run this in Supabase SQL Editor

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  quantity int not null default 1,
  total_amount numeric not null,
  delivery_type text not null check (delivery_type in ('pickup', 'grab')),
  pickup_location text check (pickup_location in ('donmueang', 'siam', 'chula')),
  delivery_address text,
  pickup_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'ready', 'completed', 'cancelled')),
  payment_slip_url text,
  note text,
  created_at timestamptz default now()
);

create table if not exists settings (
  id int primary key default 1,
  is_accepting_orders boolean not null default true
);

insert into settings (id, is_accepting_orders) values (1, true)
  on conflict (id) do nothing;

-- Storage bucket for slips (run in Supabase dashboard or via API)
-- Create bucket named "slips" with public access
