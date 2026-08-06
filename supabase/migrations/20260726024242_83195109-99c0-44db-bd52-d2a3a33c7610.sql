
-- Admins can do anything in media bucket; authenticated can read
CREATE POLICY "admins manage media" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated read media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'media');
