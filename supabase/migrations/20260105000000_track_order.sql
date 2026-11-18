-- Suivi de commande côté client : référence + numéro de téléphone requis.
create or replace function public.track_order(p_reference text, p_phone text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if length(v_digits) < 8 or length(coalesce(p_reference, '')) > 30 then
    return null;
  end if;

  select * into v_order from public.orders
  where reference = upper(trim(p_reference))
    and right(regexp_replace(customer_phone, '\D', '', 'g'), 8) = right(v_digits, 8);

  if not found then return null; end if;

  return jsonb_build_object(
    'reference', v_order.reference,
    'status', v_order.status,
    'created_at', v_order.created_at,
    'fulfillment_type', v_order.fulfillment_type,
    'total', v_order.total_xof,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name', product_name, 'quantity', quantity)), '[]'::jsonb)
              from public.order_items where order_id = v_order.id)
  );
end $$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;
