-- Migration: ensure merchants are visible to authenticated users and preserve merchant RLS rules
ALTER TABLE IF EXISTS public.merchants
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "merchants_select_policy" ON public.merchants;
CREATE POLICY "merchants_select_policy"
  ON public.merchants
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "merchants_insert_policy" ON public.merchants;
CREATE POLICY "merchants_insert_policy"
  ON public.merchants
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND id::text = auth.uid()::text);

DROP POLICY IF EXISTS "merchants_update_policy" ON public.merchants;
CREATE POLICY "merchants_update_policy"
  ON public.merchants
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND id::text = auth.uid()::text)
  WITH CHECK (auth.uid() IS NOT NULL AND id::text = auth.uid()::text);

DROP POLICY IF EXISTS "merchants_delete_policy" ON public.merchants;
CREATE POLICY "merchants_delete_policy"
  ON public.merchants
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND id::text = auth.uid()::text);
