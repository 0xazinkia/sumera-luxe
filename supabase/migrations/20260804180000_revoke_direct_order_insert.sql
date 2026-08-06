-- CRITICAL FIX: place_order (20260804160000) was hardened to recompute all
-- pricing server-side, but public.orders/public.order_items still carried
-- direct INSERT grants to anon/authenticated plus permissive
-- WITH CHECK (true) policies from the original 20260725135210 migration.
-- That means a client could call
--   supabase.from('orders').insert({ total: 1, subtotal: 1, ... })
--   supabase.from('order_items').insert({ unit_price: 0.01, ... })
-- directly via the SDK and completely bypass place_order's server-side price
-- recomputation, fully undermining that fix. All order creation must go
-- through the SECURITY DEFINER place_order() RPC, which inserts as the
-- function owner regardless of the caller's table grants.

DROP POLICY IF EXISTS "orders: anyone can place" ON public.orders;
DROP POLICY IF EXISTS "order_items: anyone insert" ON public.order_items;

REVOKE INSERT ON public.orders FROM anon, authenticated;
REVOKE INSERT ON public.order_items FROM anon, authenticated;
