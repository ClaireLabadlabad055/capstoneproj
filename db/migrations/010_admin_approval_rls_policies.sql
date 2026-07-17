-- Admin approval write policy for merchants, customers, and profiles
-- Run this in the Supabase SQL editor.

ALTER TABLE IF EXISTS public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "merchants_admin_update_policy" ON public.merchants;
CREATE POLICY "merchants_admin_update_policy"
  ON public.merchants
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "customers_admin_update_policy" ON public.customers;
CREATE POLICY "customers_admin_update_policy"
  ON public.customers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_admin_update_policy" ON public.profiles;
CREATE POLICY "profiles_admin_update_policy"
  ON public.profiles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "merchants_admin_insert_policy" ON public.merchants;
CREATE POLICY "merchants_admin_insert_policy"
  ON public.merchants
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "customers_admin_insert_policy" ON public.customers;
CREATE POLICY "customers_admin_insert_policy"
  ON public.customers
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_admin_insert_policy" ON public.profiles;
CREATE POLICY "profiles_admin_insert_policy"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "orders_admin_update_policy" ON public.orders;
CREATE POLICY "orders_admin_update_policy"
  ON public.orders
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "orders_admin_insert_policy" ON public.orders;
CREATE POLICY "orders_admin_insert_policy"
  ON public.orders
  FOR INSERT
  WITH CHECK (true);
