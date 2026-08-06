-- Rename old product variant columns to the new color/size names.
-- This is safe to run on existing databases and will no-op on new databases
-- where the columns are already named correctly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
      AND column_name = 'option_name'
  ) THEN
    ALTER TABLE public.product_variants RENAME COLUMN option_name TO color;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
      AND column_name = 'option_value'
  ) THEN
    ALTER TABLE public.product_variants RENAME COLUMN option_value TO size;
  END IF;
END $$;
