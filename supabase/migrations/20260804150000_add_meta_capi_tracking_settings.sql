-- Meta Conversions API tracking settings (singleton row).
-- The access token is never exposed via SELECT grants; only service_role
-- (used by the meta-capi edge function) and the admin RPCs below can touch it.
CREATE TABLE public.tracking_settings (
  id INT PRIMARY KEY DEFAULT 1,
  meta_pixel_id TEXT,
  meta_access_token TEXT,
  meta_capi_enabled BOOLEAN NOT NULL DEFAULT false,
  meta_test_event_code TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (id = 1)
);

-- No SELECT/UPDATE grants for anon/authenticated: the table is only reachable
-- via service_role (edge function) or the SECURITY DEFINER RPCs below.
GRANT ALL ON public.tracking_settings TO service_role;
ALTER TABLE public.tracking_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_tracking_settings_updated BEFORE UPDATE ON public.tracking_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.tracking_settings (id) VALUES (1);

-- Admin-only read that never returns the raw access token.
CREATE OR REPLACE FUNCTION public.admin_get_tracking_settings()
RETURNS TABLE (
  meta_pixel_id TEXT,
  meta_capi_enabled BOOLEAN,
  meta_test_event_code TEXT,
  has_access_token BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    ts.meta_pixel_id,
    ts.meta_capi_enabled,
    ts.meta_test_event_code,
    (ts.meta_access_token IS NOT NULL AND ts.meta_access_token <> '')
  FROM public.tracking_settings ts
  WHERE ts.id = 1;
END;
$$;

-- Admin-only write. Passing NULL/empty for the token keeps the existing one.
CREATE OR REPLACE FUNCTION public.admin_save_tracking_settings(
  _meta_pixel_id TEXT,
  _meta_capi_enabled BOOLEAN,
  _meta_test_event_code TEXT,
  _meta_access_token TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.tracking_settings
  SET
    meta_pixel_id = _meta_pixel_id,
    meta_capi_enabled = _meta_capi_enabled,
    meta_test_event_code = _meta_test_event_code,
    meta_access_token = CASE
      WHEN _meta_access_token IS NOT NULL AND _meta_access_token <> '' THEN _meta_access_token
      ELSE meta_access_token
    END
  WHERE id = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_tracking_settings() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_save_tracking_settings(TEXT, BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_tracking_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_tracking_settings(TEXT, BOOLEAN, TEXT, TEXT) TO authenticated;
