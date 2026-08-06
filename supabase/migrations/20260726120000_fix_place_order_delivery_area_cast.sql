CREATE OR REPLACE FUNCTION public.place_order(_order jsonb, _items jsonb)
RETURNS TABLE(id uuid, order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid := gen_random_uuid();
  new_number text;
  item jsonb;
  item_count int;
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

  INSERT INTO public.orders (
    id, customer_name, phone, address, city, area,
    delivery_fee, subtotal, total, notes, discount_code, discount_amount, status
  ) VALUES (
    new_id,
    btrim(_order->>'customer_name'),
    btrim(_order->>'phone'),
    btrim(_order->>'address'),
    NULLIF(btrim(coalesce(_order->>'city','')), ''),
    (_order->>'area')::public.delivery_area,
    coalesce((_order->>'delivery_fee')::numeric, 0),
    coalesce((_order->>'subtotal')::numeric, 0),
    coalesce((_order->>'total')::numeric, 0),
    NULLIF(_order->>'notes',''),
    NULLIF(_order->>'discount_code',''),
    coalesce((_order->>'discount_amount')::numeric, 0),
    'pending'
  )
  RETURNING orders.order_number INTO new_number;

  FOR item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    IF coalesce((item->>'quantity')::int, 0) <= 0
       OR coalesce((item->>'unit_price')::numeric, -1) < 0 THEN
      RAISE EXCEPTION 'Invalid item';
    END IF;
    INSERT INTO public.order_items (
      order_id, product_id, product_name, variant_label,
      unit_price, quantity, line_total, image_url
    ) VALUES (
      new_id,
      NULLIF(item->>'product_id','')::uuid,
      item->>'product_name',
      NULLIF(item->>'variant_label',''),
      (item->>'unit_price')::numeric,
      (item->>'quantity')::int,
      (item->>'unit_price')::numeric * (item->>'quantity')::int,
      NULLIF(item->>'image_url','')
    );
  END LOOP;

  IF coalesce(NULLIF(_order->>'discount_code',''), '') <> '' THEN
    PERFORM public.redeem_discount_code(_order->>'discount_code');
  END IF;

  RETURN QUERY SELECT new_id, new_number;
END; $$;

GRANT EXECUTE ON FUNCTION public.place_order(jsonb, jsonb) TO anon, authenticated;
