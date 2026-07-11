-- Run this in Supabase SQL Editor

alter table orders add column if not exists recipient_line_id text;
