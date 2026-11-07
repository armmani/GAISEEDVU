-- Customer ↔ shop chat (one thread per customer)
-- Run this in the Supabase SQL Editor.

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  -- The customer the thread belongs to. Admin replies are stored on the same
  -- row set with sender = 'admin'.
  user_id uuid not null references auth.users(id) on delete cascade,
  sender text not null check (sender in ('customer', 'admin')),
  body text not null,
  -- Set when the other side has seen the message: admin reading a customer
  -- message, or the customer reading an admin reply.
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx on messages (user_id, created_at);
create index if not exists messages_unread_idx on messages (user_id, sender) where read_at is null;

-- Same posture as the rest of the schema: RLS on with no policies, so the
-- table is reachable only through the API routes (service role key).
alter table messages enable row level security;
