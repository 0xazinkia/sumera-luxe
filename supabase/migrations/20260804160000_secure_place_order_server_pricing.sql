-- Harden place_order: recompute all monetary values server-side so a
-- tampered client request can never change what gets charged/recorded,
-- and so Meta Purchase events (event value/currency) reflect trusted data.
-- Return type changed from the prior definition, so it must be dropped first.
DROP FUNCTION IF EXISTS public.place_order(jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.place_order(_order jsonb, _items jsonb)
RETURNS TABLE(id uuid, order_number text, subtotal numeric, delivery_fee numeric, discount_amount numeric, total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid := gen_random_uuid();
  new_number text;
  item jsonb;
  item_count int;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity int;
  v_unit_price numeric;
  v_product_name text;
  v_image_url text;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_area text;
  v_delivery_fee numeric := 0;
  v_discount_code text;
  v_discount_amount numeric := 0;
  v_dc RECORD;
  v_total numeric;
  v_settings RECORD;
BEGIN
  IF _order IS NULL OR _items IS NULL THEN
    RAISE EXCEPTION 'Missing order or items';
  END IF;

  item_count := jsonb_array_length(_items);
  IF item_count IS NULL OR item_count = 0 OR item_count > 100 THEN
    RAISE EXCEPTION 'Invalid items';
  END IF;

  IF coalesce(btrim(_order->>'customer_name'),'') = ''
     OR coalesce(btrim(_order->>'phone'),'') = ''
     OR length(btrim(_order->>'phone')) < 6
     OR coalesce(btrim(_order->>'address'),'') = '' THEN
    RAISE EXCEPTION 'Invalid customer info';
  END IF;

  v_area := _order->>'area';
  IF v_area NOT IN ('inside_dhaka', 'outside_dhaka') THEN
    RAISE EXCEPTION 'Invalid delivery area';
  END IF;

  -- "id" is unqualified-ambiguous here because RETURNS TABLE(id uuid, ...)
  -- implicitly declares an "id" variable in scope for the whole function.
  SELECT delivery_inside_dhaka, delivery_outside_dhaka INTO v_settings
  FROM public.site_settings WHERE site_settings.id = 1;

  v_delivery_fee := CASE WHEN v_area = 'inside_dhaka' THEN v_settings.delivery_inside_dhaka ELSE v_settings.delivery_outside_dhaka END;

  -- Pass 1: recompute subtotal from trusted product/variant prices (ignore client unit_price).
  FOR item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_quantity := coalesce((item->>'quantity')::int, 0);
    IF v_quantity <= 0 OR v_quantity > 1000 THEN
      RAISE EXCEPTION 'Invalid item quantity';
    END IF;

    v_product_id := NULLIF(item->>'product_id', '')::uuid;
    v_variant_id := NULLIF(item->>'variant_id', '')::uuid;

    IF v_variant_id IS NOT NULL THEN
      SELECT coalesce(pv.discount_price, pv.price) INTO v_unit_price
      FROM public.product_variants pv
      WHERE pv.id = v_variant_id AND pv.product_id = v_product_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid product variant';
      END IF;
    ELSIF v_product_id IS NOT NULL THEN
      SELECT coalesce(p.discount_price, p.base_price) INTO v_unit_price
      FROM public.products p
      WHERE p.id = v_product_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid product';
      END IF;
    ELSE
      RAISE EXCEPTION 'Missing product reference';
    END IF;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  END LOOP;

  -- Recompute discount from the trusted subtotal, never from the client amount.
  v_discount_code := NULLIF(btrim(_order->>'discount_code'), '');
  IF v_discount_code IS NOT NULL THEN
    SELECT * INTO v_dc FROM public.discount_codes
    WHERE lower(code) = lower(v_discount_code) AND is_active = true;

    IF FOUND
       AND (v_dc.expires_at IS NULL OR v_dc.expires_at > now())
       AND (v_dc.max_uses IS NULL OR v_dc.used_count < v_dc.max_uses)
       AND v_subtotal >= v_dc.min_subtotal THEN
      v_discount_amount := CASE
        WHEN v_dc.type = 'percent' THEN round(v_subtotal * v_dc.value / 100)
        ELSE least(v_dc.value, v_subtotal)
      END;
    ELSE
      v_discount_code := NULL;
    END IF;
  END IF;

  v_total := greatest(0, v_subtotal - v_discount_amount) + v_delivery_fee;

  INSERT INTO public.orders (
    id, customer_name, phone, address, city, area,
    delivery_fee, subtotal, total, notes, discount_code, discount_amount, status
  ) VALUES (
    new_id,
    btrim(_order->>'customer_name'),
    btrim(_order->>'phone'),
    btrim(_order->>'address'),
    NULLIF(btrim(coalesce(_order->>'city','')), ''),
    v_area::public.delivery_area,
    v_delivery_fee,
    v_subtotal,
    v_total,
    NULLIF(_order->>'notes',''),
    v_discount_code,
    v_discount_amount,
    'pending'
  )
  RETURNING orders.order_number INTO new_number;

  -- Pass 2: insert order_items using the same trusted prices.
  FOR item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_quantity := (item->>'quantity')::int;
    v_product_id := NULLIF(item->>'product_id', '')::uuid;
    v_variant_id := NULLIF(item->>'variant_id', '')::uuid;
    v_product_name := item->>'product_name';
    v_image_url := NULLIF(item->>'image_url', '');

    IF v_variant_id IS NOT NULL THEN
      SELECT coalesce(pv.discount_price, pv.price) INTO v_unit_price
      FROM public.product_variants pv
      WHERE pv.id = v_variant_id AND pv.product_id = v_product_id;
    ELSE
      SELECT coalesce(p.discount_price, p.base_price) INTO v_unit_price
      FROM public.products p
      WHERE p.id = v_product_id;
    END IF;

    v_line_total := v_unit_price * v_quantity;

    INSERT INTO public.order_items (
      order_id, product_id, product_name, variant_label,
      unit_price, quantity, line_total, image_url
    ) VALUES (
      new_id,
      v_product_id,
      v_product_name,
      NULLIF(item->>'variant_label', ''),
      v_unit_price,
      v_quantity,
      v_line_total,
      v_image_url
    );
  END LOOP;

  IF v_discount_code IS NOT NULL THEN
    PERFORM public.redeem_discount_code(v_discount_code);
  END IF;

  RETURN QUERY SELECT new_id, new_number, v_subtotal, v_delivery_fee, v_discount_amount, v_total;
END; $$;

GRANT EXECUTE ON FUNCTION public.place_order(jsonb, jsonb) TO anon, authenticated;
