-- has_role() was created with an explicit REVOKE from PUBLIC/anon
-- (20260725135244_...sql) but authenticated was never re-granted EXECUTE.
-- Without this, every RLS policy that calls public.has_role(auth.uid(), ...)
-- for the authenticated role (products/banners/orders/site_settings/etc. admin
-- writes, plus the new tracking_settings RPCs' internal checks) can fail with
-- "permission denied for function has_role", and any direct
-- supabase.rpc('has_role', ...) call from an authenticated client fails too.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
