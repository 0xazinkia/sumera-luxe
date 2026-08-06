# Phase 2 — Admin Panel & Backend

Lovable Cloud is enabled. This phase moves products, categories, orders, and site content from the static `src/lib/data.ts` model into the database, adds admin authentication, and ships a full admin CMS.

## 1. Database schema (single migration)

Tables (all `public`, with GRANTs + RLS):

- `categories` — `id, slug (unique), name, tagline, image_url, sort_order, created_at`
- `products` — `id, slug (unique), name, category_id → categories, description, base_price, currency, in_stock, is_featured, sort_order, created_at, updated_at`
- `product_variants` — `id, product_id → products, label (e.g. "50 ml"), price, sku, image_url, sort_order`
- `product_images` — `id, product_id → products, url, alt, sort_order`
- `orders` — `id, order_number (unique), customer_name, phone, address, area (inside/outside_dhaka), delivery_fee, subtotal, total, notes, status (pending/confirmed/shipped/delivered/cancelled), created_at`
- `order_items` — `id, order_id → orders, product_id, product_name, variant_label, unit_price, quantity, line_total`
- `hero_slides` — `id, image_url, eyebrow, title, subtitle, cta_label, cta_href, sort_order, active`
- `banners` — `id, slot (top/mid), image_url, title, subtitle, cta_label, cta_href, active`
- `site_settings` — singleton row (`id=1`): `whatsapp_number, delivery_inside_dhaka, delivery_outside_dhaka, brand_tagline, contact_email, facebook_url`
- `user_roles` — `id, user_id → auth.users, role (enum: admin, staff)` + `has_role()` security-definer function

RLS pattern:
- Public read (anon+authenticated) on catalog + content tables (categories, products, variants, images, hero_slides, banners, site_settings)
- Public insert on `orders` + `order_items` (COD checkout, no login required)
- Admin-only mutations everywhere else via `has_role(auth.uid(),'admin')`
- Orders read: admins only

Storage: `product-images` bucket (public), `banner-images` bucket (public).

## 2. Auth

- Email + password only (per Phase 1 decision)
- Public `/auth` route: sign-in + sign-up tabs
- First user to sign up is auto-granted `admin` role (via `handle_new_user` trigger that checks if `user_roles` is empty)
- Later signups get no role — they can browse but can't touch admin
- Admin gate: `src/routes/_authenticated/admin/` layout checks `has_role`

## 3. Seed migration

Insert current static catalog (5 categories, ~10 products with variants + images) as literal INSERTs so the storefront doesn't go blank.

## 4. Storefront rewire

Replace `src/lib/data.ts` in-memory reads with TanStack Query hooks that call Supabase:
- Home, `/products`, `/category/$slug`, `/products/$slug` — all read from DB via `useSuspenseQuery` in loaders
- Checkout writes to `orders` + `order_items` (COD stays; WhatsApp message still generated)
- Delivery fees + WhatsApp number read from `site_settings`

## 5. Admin panel (`/admin`)

Routes under `_authenticated/admin/`:
- `/admin` — dashboard (order count by status, revenue today, low-stock)
- `/admin/orders` — list, filter by status, detail view, status update
- `/admin/products` — list, create, edit (with variants + images)
- `/admin/categories` — list, create/edit
- `/admin/hero` — manage hero slides
- `/admin/banners` — manage promo banners
- `/admin/settings` — WhatsApp number, delivery fees, brand info

Admin uses shadcn form primitives, upload to Storage buckets, live preview.

## 6. Header/footer polish

Show admin link in header when signed-in admin. Sign-in link for public. Sign-out in admin layout.

## Technical notes

- All DB reads for storefront use publishable-key client (public policies handle safety)
- Admin writes use browser `supabase` client under RLS as the signed-in admin
- Images: `supabase.storage.from('product-images').upload(...)` from admin forms
- Order number format: `SL-YYYYMMDD-XXXX` generated in DB trigger
- Managed `_authenticated` layout already exists — nested `admin/route.tsx` adds the `has_role` check
- `handle_new_user` trigger runs on `auth.users` insert; grants admin only when `user_roles` is empty

## Deferred to Phase 3

- Discount codes
- Multi-image gallery upload UX polish (drag reorder)
- Email order notifications
- Staff RBAC (staff role exists in enum but no dedicated UI split — admins do everything)
- Bkash/Nagad payment providers (COD-only for now)

Ready to build. This is one large batch — expect the migration + ~20 file changes.
