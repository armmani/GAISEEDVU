-- Run this in Supabase SQL Editor
-- Admin-editable normal price + signup code that gives a special price

alter table settings add column if not exists price_per_piece int not null default 65;
alter table settings add column if not exists signup_code text;
alter table settings add column if not exists signup_code_price int not null default 60;
