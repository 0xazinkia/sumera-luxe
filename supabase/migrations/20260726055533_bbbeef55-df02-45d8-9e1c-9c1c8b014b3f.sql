

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_code text, ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'percent',
  value numeric NOT NULL DEFAULT 0,
  min_subtotal numeric NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.discount_codes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discount_codes: public read active" ON public.discount_codes;
CREATE POLICY "discount_codes: public read active" ON public.discount_codes
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "discount_codes: admin manage" ON public.discount_codes;
CREATE POLICY "discount_codes: admin manage" ON public.discount_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.redeem_discount_code(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.discount_codes
     SET used_count = used_count + 1, updated_at = now()
   WHERE lower(code) = lower(_code)
     AND is_active = true
     AND (expires_at IS NULL OR expires_at > now())
     AND (max_uses IS NULL OR used_count < max_uses);
  RETURN FOUND;
END; $$;

GRANT EXECUTE ON FUNCTION public.redeem_discount_code(text) TO anon, authenticated, service_role;

-- Staff access: orders only
DROP POLICY IF EXISTS "orders: staff read" ON public.orders;
CREATE POLICY "orders: staff read" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "orders: staff update" ON public.orders;
CREATE POLICY "orders: staff update" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "order_items: staff read" ON public.order_items;
CREATE POLICY "order_items: staff read" ON public.order_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));

-- Admins manage roles
DROP POLICY IF EXISTS "user_roles: admin read all" ON public.user_roles;
CREATE POLICY "user_roles: admin read all" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_roles: admin manage" ON public.user_roles;
CREATE POLICY "user_roles: admin manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
