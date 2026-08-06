ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand_name TEXT NOT NULL DEFAULT 'Suméra Luxe';
