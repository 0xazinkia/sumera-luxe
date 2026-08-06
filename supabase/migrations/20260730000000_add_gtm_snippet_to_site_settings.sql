alter table public.site_settings
add column if not exists gtm_head_snippet text,
add column if not exists gtm_body_snippet text;

comment on column public.site_settings.gtm_head_snippet is 'Tracking snippets to inject into the page head';
comment on column public.site_settings.gtm_body_snippet is 'Tracking snippets to inject into the page body fallback area';
