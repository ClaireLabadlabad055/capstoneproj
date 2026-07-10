-- Migration: create orders table with jsonb items
-- Run this in Supabase SQL editor or via supabase CLI

CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  user_id uuid,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(12,2) NOT NULL DEFAULT 0,
  pickup_point_id text,
  status text NOT NULL DEFAULT 'Preparing',
  customer_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure columns exist if the table already exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total numeric(12,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_point_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'Preparing';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid;

-- Useful indexes
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at);
CREATE INDEX IF NOT EXISTS orders_pickup_point_idx ON public.orders (pickup_point_id);

-- Row Level Security example (for testing only). Uncomment and adjust for production.
-- ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY allow_insert_orders_for_authenticated
--   ON public.orders
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);
