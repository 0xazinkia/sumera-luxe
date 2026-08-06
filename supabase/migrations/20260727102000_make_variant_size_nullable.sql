-- Make `size` nullable so variants can omit size when not applicable.
DO $$
BEGIN
	-- Only proceed if the column exists and is currently NOT NULL
	IF EXISTS(
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'product_variants' AND column_name = 'size' AND is_nullable = 'NO'
	) THEN
		-- Convert empty-string placeholders to NULL to avoid semantic conflicts
		UPDATE public.product_variants SET size = NULL WHERE size = '';

		-- Drop NOT NULL constraint
		ALTER TABLE public.product_variants ALTER COLUMN size DROP NOT NULL;
	END IF;
END$$;
