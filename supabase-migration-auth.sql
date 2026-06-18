-- Run this in Supabase SQL Editor

-- 1. Profiles table
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  default_address text,
  updated_at timestamptz default now()
);

-- 2. Add user_id to orders
alter table orders add column if not exists user_id uuid references auth.users(id);
