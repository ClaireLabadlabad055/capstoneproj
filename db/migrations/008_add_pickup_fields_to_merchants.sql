ALTER TABLE public.merchants
ADD COLUMN IF NOT EXISTS pickup_landmark text;

ALTER TABLE public.merchants
ADD COLUMN IF NOT EXISTS pickup_details text;