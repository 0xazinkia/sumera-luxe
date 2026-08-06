
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','staff');
CREATE TYPE public.order_status AS ENUM ('pending','confirmed','shipped','delivered','cancelled');
CREATE TYPE public.delivery_area AS ENUM ('inside_dhaka','outside_dhaka');

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "user_roles: users read own"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- First signup becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories: public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories: admin write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_price NUMERIC(10,2),
  stock INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products: public read" ON public.products FOR SELECT USING (true);
CREATE POLICY "products: admin write" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_products_category ON public.products(category_id);

-- ============ PRODUCT IMAGES ============
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_images: public read" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "product_images: admin write" ON public.product_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_product_images_product ON public.product_images(product_id);

-- ============ PRODUCT VARIANTS ============
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  discount_price NUMERIC(10,2),
  image_url TEXT,
  stock INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_variants: public read" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "product_variants: admin write" ON public.product_variants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);

-- ============ HERO SLIDES ============
CREATE TABLE public.hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  eyebrow TEXT,
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_label TEXT,
  cta_href TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_slides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hero_slides TO authenticated;
GRANT ALL ON public.hero_slides TO service_role;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hero_slides: public read" ON public.hero_slides FOR SELECT USING (true);
CREATE POLICY "hero_slides: admin write" ON public.hero_slides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ BANNERS ============
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot TEXT NOT NULL,
  image_url TEXT NOT NULL,
  eyebrow TEXT,
  title TEXT,
  subtitle TEXT,
  cta_label TEXT,
  cta_href TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners: public read" ON public.banners FOR SELECT USING (true);
CREATE POLICY "banners: admin write" ON public.banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ SITE SETTINGS (singleton) ============
CREATE TABLE public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  brand_name TEXT NOT NULL DEFAULT 'Suméra Luxe',
  brand_tagline TEXT NOT NULL DEFAULT 'Beauty · Skincare · Gifts',
  whatsapp_number TEXT NOT NULL DEFAULT '8801322126233',
  whatsapp_display TEXT NOT NULL DEFAULT '+880 1322-126233',
  contact_email TEXT DEFAULT 'hello@sumeraluxe.com',
  facebook_url TEXT,
  instagram_url TEXT,
  delivery_inside_dhaka NUMERIC(10,2) NOT NULL DEFAULT 60,
  delivery_outside_dhaka NUMERIC(10,2) NOT NULL DEFAULT 120,
  currency_symbol TEXT NOT NULL DEFAULT 'Tk. ',
  about_text TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (id = 1)
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_settings: public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings: admin update" ON public.site_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (id, about_text) VALUES (1,
  'A quiet luxury house for the modern woman — considered fragrances, refined skincare, and gifts made to be remembered.');

-- ============ ORDERS ============
CREATE SEQUENCE public.order_seq;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  area public.delivery_area NOT NULL,
  delivery_fee NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  notes TEXT,
  status public.order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders: anyone can place" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders: admin read" ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders: admin update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders: admin delete" ON public.orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_order_number() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'SL-' || to_char(now(),'YYYYMMDD') || '-' || lpad(nextval('public.order_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_orders_number BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- ============ ORDER ITEMS ============
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_label TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.order_items TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items: anyone insert" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items: admin read" ON public.order_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "order_items: admin manage" ON public.order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- ============ SEED CATEGORIES ============
INSERT INTO public.categories (slug, name, tagline, image_url, sort_order) VALUES
  ('perfumes','Perfumes','Signature scents & eau de parfum','/seed/cat-perfumes.jpg',1),
  ('skincare','Skincare','Radiance rituals','/seed/cat-skincare.jpg',2),
  ('makeup','Makeup','Considered colour','/seed/cat-makeup.jpg',3),
  ('gift-sets','Gift Sets','Ready to gift','/seed/cat-gifts.jpg',4),
  ('bath-body','Bath & Body','Softness, always','/seed/cat-bath.jpg',5);

-- ============ SEED PRODUCTS ============
DO $$
DECLARE
  c_perfumes UUID; c_skincare UUID; c_makeup UUID; c_gifts UUID; c_bath UUID;
  p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID; p6 UUID; p7 UUID; p8 UUID;
BEGIN
  SELECT id INTO c_perfumes FROM public.categories WHERE slug='perfumes';
  SELECT id INTO c_skincare FROM public.categories WHERE slug='skincare';
  SELECT id INTO c_makeup FROM public.categories WHERE slug='makeup';
  SELECT id INTO c_gifts FROM public.categories WHERE slug='gift-sets';
  SELECT id INTO c_bath FROM public.categories WHERE slug='bath-body';

  INSERT INTO public.products (slug,name,category_id,description,base_price,discount_price,stock,is_featured,is_new,sort_order) VALUES
    ('rose-noir-eau-de-parfum','Rose Noir Eau de Parfum',c_perfumes,'A signature blend of Turkish rose, oud, and warm amber. Long-lasting sillage in a hand-finished bottle with a brushed gold cap.',3800,3200,24,true,true,1) RETURNING id INTO p1;
  INSERT INTO public.products (slug,name,category_id,description,base_price,stock,sort_order) VALUES
    ('amber-oud-parfum','Amber Oud Parfum',c_perfumes,'Rich amber, smoky oud, and a whisper of vanilla — an evening signature.',4200,15,2) RETURNING id INTO p2;
  INSERT INTO public.products (slug,name,category_id,description,base_price,discount_price,stock,is_featured,sort_order) VALUES
    ('velvet-radiance-day-cream','Velvet Radiance Day Cream',c_skincare,'Featherweight moisture with niacinamide and squalane for a soft, radiant finish.',2400,1990,30,true,3) RETURNING id INTO p3;
  INSERT INTO public.products (slug,name,category_id,description,base_price,stock,is_new,sort_order) VALUES
    ('glow-drop-serum','Glow Drop Vitamin C Serum',c_skincare,'Stabilised vitamin C, hyaluronic acid, and rose extract. Brightens overnight.',2200,22,true,4) RETURNING id INTO p4;
  INSERT INTO public.products (slug,name,category_id,description,base_price,discount_price,stock,is_featured,sort_order) VALUES
    ('satin-matte-lipstick','Satin Matte Lipstick',c_makeup,'Weightless matte finish in a hand-buffed gold bullet.',950,790,40,true,5) RETURNING id INTO p5;
  INSERT INTO public.products (slug,name,category_id,description,base_price,stock,sort_order) VALUES
    ('blush-duo-palette','Blush Duo Palette',c_makeup,'A soft rose and warm terracotta pair — sculpt and flush in one compact.',1450,18,6) RETURNING id INTO p6;
  INSERT INTO public.products (slug,name,category_id,description,base_price,discount_price,stock,is_featured,is_new,sort_order) VALUES
    ('luxe-signature-gift-box','Luxe Signature Gift Box',c_gifts,'A curated box: eau de parfum, day cream, and a silk-wrapped ribbon. Ready to gift.',3600,2990,12,true,true,7) RETURNING id INTO p7;
  INSERT INTO public.products (slug,name,category_id,description,base_price,stock,sort_order) VALUES
    ('rose-body-oil','Rose Body Oil',c_bath,'Cold-pressed rosehip and jojoba for a soft, luminous finish.',1650,20,8) RETURNING id INTO p8;

  -- Images
  INSERT INTO public.product_images (product_id, url, alt, sort_order) VALUES
    (p1,'/seed/product-perfume-rose.jpg','Rose Noir bottle',1),
    (p1,'/seed/product-perfume-amber.jpg','Rose Noir amber angle',2),
    (p2,'/seed/product-perfume-amber.jpg','Amber Oud bottle',1),
    (p3,'/seed/product-cream.jpg','Velvet Radiance Day Cream',1),
    (p4,'/seed/product-serum.jpg','Glow Drop Serum',1),
    (p5,'/seed/product-lipstick.jpg','Satin Matte Lipstick',1),
    (p6,'/seed/product-palette.jpg','Blush Duo Palette',1),
    (p7,'/seed/product-giftbox.jpg','Luxe Signature Gift Box',1),
    (p8,'/seed/product-bodyoil.jpg','Rose Body Oil',1);

  -- Variants
  INSERT INTO public.product_variants (product_id,color,size,price,discount_price,image_url,stock,sort_order) VALUES
    (p1,'Size','50 ml',3800,3200,'/seed/product-perfume-rose.jpg',12,1),
    (p1,'Size','100 ml',4500,3900,'/seed/product-perfume-amber.jpg',8,2),
    (p5,'Shade','Nude Rose',950,790,'/seed/product-lipstick.jpg',20,1),
    (p5,'Shade','Deep Berry',950,790,'/seed/product-lipstick.jpg',12,2),
    (p5,'Shade','Signature Red',950,790,'/seed/product-lipstick.jpg',8,3);
END $$;

-- ============ SEED HERO + BANNER ============
INSERT INTO public.hero_slides (image_url,eyebrow,title,subtitle,cta_label,cta_href,sort_order) VALUES
  ('/seed/hero-1.jpg','New Season','Signature Scents, Softly Remembered','A luxury edit of Turkish rose, oud and warm amber.','Shop Perfumes','/category/perfumes',1),
  ('/seed/hero-2.jpg','Skincare Ritual','Considered Skincare, Radiant Finish','Formulated for a luminous, well-cared-for glow.','Shop Skincare','/category/skincare',2),
  ('/seed/hero-3.jpg','Gifting Edit','Wrapped, Ribboned, Ready to Gift','Curated boxes for the ones you love — and yourself.','Shop Gifts','/category/gift-sets',3);

INSERT INTO public.banners (slot,image_url,eyebrow,title,subtitle,cta_label,cta_href,sort_order) VALUES
  ('mid','/seed/promo-banner.jpg','Cash on Delivery','Free wrapping on every order','Add a handwritten note at checkout — ready to gift.','Start shopping','/products',1);
