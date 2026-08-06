
CREATE OR REPLACE FUNCTION public.list_team()
RETURNS TABLE (user_id uuid, email text, role text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT ur.user_id, u.email::text, ur.role::text
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    ORDER BY u.email;
END; $$;

CREATE OR REPLACE FUNCTION public.set_role_by_email(_email text, _role app_role, _grant boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT id INTO target FROM auth.users WHERE lower(email) = lower(_email);
  IF target IS NULL THEN
    RAISE EXCEPTION 'No account found for %', _email;
  END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (target, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    IF _role = 'admin' AND target = auth.uid() THEN
      RAISE EXCEPTION 'You cannot remove your own admin role';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = target AND role = _role;
  END IF;
  RETURN true;
END; $$;

REVOKE EXECUTE ON FUNCTION public.list_team() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_role_by_email(text, app_role, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_team() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_role_by_email(text, app_role, boolean) TO authenticated;
