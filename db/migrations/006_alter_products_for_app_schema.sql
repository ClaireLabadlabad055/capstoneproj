-- Migration: add the columns the app expects on the products table
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS orderType text,
ADD COLUMN IF NOT EXISTS vendorName text,
ADD COLUMN IF NOT EXISTS vendor_name text,
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS img text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_pkey'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);
  END IF;
END $$;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_policy" ON products;
DROP POLICY IF EXISTS "products_insert_policy" ON products;
DROP POLICY IF EXISTS "products_update_policy" ON products;
DROP POLICY IF EXISTS "products_delete_policy" ON products;

CREATE POLICY "products_select_policy"
  ON products
  FOR SELECT
  USING (true);

CREATE POLICY "products_insert_policy"
  ON products
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (vendor_id IS NULL OR vendor_id::text = auth.uid()::text));

CREATE POLICY "products_update_policy"
  ON products
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (vendor_id IS NULL OR vendor_id::text = auth.uid()::text))
  WITH CHECK (auth.uid() IS NOT NULL AND (vendor_id IS NULL OR vendor_id::text = auth.uid()::text));

CREATE POLICY "products_delete_policy"
  ON products
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND (vendor_id IS NULL OR vendor_id::text = auth.uid()::text));
