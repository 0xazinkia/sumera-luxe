CREATE OR REPLACE FUNCTION public.track_orders_by_phone(_phone text)
RETURNS TABLE(
  id uuid,
  order_number text,
  customer_name text,
  phone text,
  address text,
  city text,
  area text,
  subtotal numeric,
  delivery_fee numeric,
  discount_amount numeric,
  total numeric,
  status text,
  created_at timestamptz,
  items jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.order_number,
    o.customer_name,
    o.phone,
    o.address,
    o.city,
    o.area::text,
    o.subtotal,
    o.delivery_fee,
    o.discount_amount,
    o.total,
    o.status::text,
    o.created_at,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', oi.product_name,
        'variant', oi.variant_label,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'image', oi.image_url
      ) ORDER BY oi.created_at)
      FROM public.order_items oi WHERE oi.order_id = o.id
    ), '[]'::jsonb) AS items
  FROM public.orders o
  WHERE regexp_replace(o.phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g')
    AND length(regexp_replace(_phone, '\D', '', 'g')) >= 6
  ORDER BY o.created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.track_orders_by_phone(text) TO anon, authenticated;