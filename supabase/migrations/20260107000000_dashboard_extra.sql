-- Tableau de bord : comparaison de période, heures, livraison, catégories

create or replace function public.admin_dashboard_extra(p_days int default 14)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  tz constant text := 'Africa/Niamey';
  v_days int := greatest(1, least(coalesce(p_days, 14), 90));
  v_today date := (now() at time zone tz)::date;
  v_start date := v_today - (v_days - 1);
  v_from timestamptz := (v_start - v_days)::timestamp at time zone tz;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  with o as (
    select id, status, total_xof, fulfillment_type, source,
           (created_at at time zone tz)::date as d,
           extract(hour from (created_at at time zone tz))::int as h
    from public.orders
    where created_at >= v_from
  ),
  cur as (select * from o where d >= v_start),
  prev as (select * from o where d < v_start)
  select jsonb_build_object(
    'current', (select jsonb_build_object(
      'orders', count(*) filter (where status <> 'cancelled'),
      'revenue', coalesce(sum(total_xof) filter (where status = 'completed'), 0),
      'completed', count(*) filter (where status = 'completed'),
      'cancelled', count(*) filter (where status = 'cancelled')) from cur),
    'previous', (select jsonb_build_object(
      'orders', count(*) filter (where status <> 'cancelled'),
      'revenue', coalesce(sum(total_xof) filter (where status = 'completed'), 0),
      'completed', count(*) filter (where status = 'completed'),
      'cancelled', count(*) filter (where status = 'cancelled')) from prev),
    'by_hour', (select jsonb_agg(jsonb_build_object('hour', g.h, 'orders', coalesce(c.n, 0)) order by g.h)
      from generate_series(0, 23) as g(h)
      left join (select h, count(*) as n from cur where status <> 'cancelled' group by h) c on c.h = g.h),
    'fulfillment', (select coalesce(jsonb_object_agg(fulfillment_type, n), '{}'::jsonb)
      from (select fulfillment_type, count(*) as n from cur where status <> 'cancelled' group by fulfillment_type) f),
    'sources', (select coalesce(jsonb_object_agg(source, n), '{}'::jsonb)
      from (select source, count(*) as n from cur where status <> 'cancelled' group by source) s),
    'categories', (select coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'revenue', t.revenue) order by t.revenue desc), '[]'::jsonb)
      from (select coalesce(c.name, 'Autres') as name, sum(oi.line_total_xof)::int as revenue
            from public.order_items oi
            join cur on cur.id = oi.order_id
            left join public.products p on p.id = oi.product_id
            left join public.categories c on c.id = p.category_id
            where cur.status = 'completed'
            group by coalesce(c.name, 'Autres')
            order by revenue desc
            limit 6) t)
  ) into result;

  return result;
end $$;

revoke all on function public.admin_dashboard_extra(int) from public, anon;
grant execute on function public.admin_dashboard_extra(int) to authenticated;

notify pgrst, 'reload schema';
