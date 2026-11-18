-- Création de commande publique : les prix sont recalculés depuis la base.
create or replace function public.create_order(
  p_name text, p_phone text, p_fulfillment text,
  p_address text, p_notes text, p_items jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_fee int; v_sub int := 0; v_cust uuid; v_order uuid; v_ref text;
  v_item jsonb; v_prod public.products%rowtype; v_qty int;
  v_lines jsonb := '[]'::jsonb;
begin
  if length(trim(coalesce(p_name,''))) < 2 or length(p_name) > 100 then raise exception 'Nom invalide'; end if;
  if coalesce(p_phone,'') !~ '^\+?[0-9 ]{8,15}$' then raise exception 'Téléphone invalide'; end if;
  if coalesce(p_fulfillment,'') not in ('delivery','pickup') then raise exception 'Mode de réception invalide'; end if;
  if length(coalesce(p_address,'')) > 300 then raise exception 'Adresse trop longue'; end if;
  if length(coalesce(p_notes,'')) > 500 then raise exception 'Instructions trop longues'; end if;
  if p_fulfillment = 'delivery' and length(trim(coalesce(p_address,''))) < 5 then
    raise exception 'Adresse de livraison requise';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'Panier invalide';
  end if;

  select delivery_fee_xof into v_fee from public.restaurant_settings where id = 1;
  if p_fulfillment = 'pickup' then v_fee := 0; end if;

  insert into public.customers (full_name, phone) values (trim(p_name), trim(p_phone))
  on conflict (phone) do update set full_name = excluded.full_name
  returning id into v_cust;

  v_ref := 'KZ-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('public.order_ref_seq')::text, 4, '0');

  insert into public.orders (reference, customer_id, customer_name, customer_phone,
    fulfillment_type, delivery_address, notes, delivery_fee_xof)
  values (v_ref, v_cust, trim(p_name), trim(p_phone), p_fulfillment,
    nullif(trim(coalesce(p_address,'')), ''), nullif(trim(coalesce(p_notes,'')), ''), v_fee)
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 50 then raise exception 'Quantité invalide'; end if;
    select * into v_prod from public.products
      where id = (v_item->>'product_id')::uuid and is_available;
    if not found then raise exception 'Produit indisponible'; end if;
    insert into public.order_items (order_id, product_id, product_name, unit_price_xof, quantity, line_total_xof)
    values (v_order, v_prod.id, v_prod.name, v_prod.price_xof, v_qty, v_prod.price_xof * v_qty);
    v_sub := v_sub + v_prod.price_xof * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'name', v_prod.name, 'quantity', v_qty,
      'unit_price', v_prod.price_xof, 'line_total', v_prod.price_xof * v_qty);
  end loop;

  update public.orders set subtotal_xof = v_sub, total_xof = v_sub + v_fee where id = v_order;

  return jsonb_build_object('reference', v_ref, 'subtotal', v_sub,
    'delivery_fee', v_fee, 'total', v_sub + v_fee, 'items', v_lines);
end $$;

revoke all on function public.create_order(text,text,text,text,text,jsonb) from public;
grant execute on function public.create_order(text,text,text,text,text,jsonb) to anon, authenticated;
