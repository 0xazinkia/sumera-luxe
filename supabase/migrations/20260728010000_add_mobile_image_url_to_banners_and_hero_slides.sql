alter table public.banners
  add column if not exists mobile_image_url text;

alter table public.hero_slides
  add column if not exists mobile_image_url text;

alter table public.hero_slides
  alter column title drop not null;
