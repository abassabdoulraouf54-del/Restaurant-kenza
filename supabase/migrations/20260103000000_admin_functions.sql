-- Statistiques du tableau de bord (admin). Le chiffre d'affaires ne compte que les commandes terminées.
create or replace function public.admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Africa/Niamey')::date;
  v_daily jsonb;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'day', d.day, 'revenue', coalesce(s.revenue, 0), 'orders', coalesce(s.cnt, 0)
         ) order by d.day), '[]'::jsonb)
  into v_daily
  from (
    select generate_series((v_today - 13)::timestamp, v_today::timestamp, interval '1 day')::date as day
  ) d
  left join (
    select (created_at at time zone 'Africa/Niamey')::date as day,
           sum(total_xof) as revenue, count(*) as cnt
    from public.orders where status = 'completed' group by 1
  ) s on s.day = d.day;

  return jsonb_build_object(
    'total_orders', (select count(*) from public.orders),
    'today_orders', (select count(*) from public.orders
                     where (created_at at time zone 'Africa/Niamey')::date = v_today),
    'revenue_xof', (select coalesce(sum(total_xof), 0) from public.orders where status = 'completed'),
    'products_count', (select count(*) from public.products),
    'unavailable_count', (select count(*) from public.products where not is_available),
    'daily', v_daily
  );
end $$;

-- Saisie manuelle d'une commande reçue par WhatsApp (admin).
create or replace function public.admin_create_order(
  p_name text, p_phone text, p_fulfillment text,
  p_address text, p_notes text, p_items jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  v_result := public.create_order(p_name, p_phone, p_fulfillment, p_address, p_notes, p_items);
  update public.orders set source = 'whatsapp_manual' where reference = v_result->>'reference';
  return v_result;
end $$;

revoke all on function public.admin_dashboard_stats() from public, anon;
revoke all on function public.admin_create_order(text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_create_order(text,text,text,text,text,jsonb) to authenticated;
