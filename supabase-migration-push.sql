-- Web push subscriptions (PWA notifications)
-- Run this in the Supabase SQL Editor.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on push_subscriptions (user_id);
create index if not exists push_subscriptions_admin_idx on push_subscriptions (is_admin) where is_admin;

-- Same posture as the rest of the schema: RLS on with no policies, so the
-- table is reachable only through the API routes (service role key).
alter table push_subscriptions enable row level security;
