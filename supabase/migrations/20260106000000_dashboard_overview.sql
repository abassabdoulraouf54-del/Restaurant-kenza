-- Tableau de bord : vue d'ensemble (KPI du jour, série, statuts, top produits)

create or replace function public.admin_dashboard_overview(p_days int default 14)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  tz constant text := 'Africa/Niamey';
  v_days int := greatest(1, least(coalesce(p_days, 14), 90));
  v_today date := (now() at time zone tz)::date;
  v_yesterday date := v_today - 1;
  v_period_start date := v_today - (v_days - 1);
  v_from timestamptz := (least(v_today - (v_days - 1), v_today - 1))::timestamp at time zone tz;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  with o as (
    select id, status, total_xof, (created_at at time zone tz)::date as d
    from public.orders
    where created_at >= v_from
  ),
  kpi as (
    select
      count(*) filter (where d = v_today and status <> 'cancelled') as t_orders,
      coalesce(sum(total_xof) filter (where d = v_today and status = 'completed'), 0) as t_revenue,
      count(*) filter (where d = v_today and status = 'completed') as t_done,
      count(*) filter (where d = v_yesterday and status <> 'cancelled') as y_orders,
      coalesce(sum(total_xof) filter (where d = v_yesterday and status = 'completed'), 0) as y_revenue,
      count(*) filter (where d = v_yesterday and status = 'completed') as y_done
    from o
  ),
  series as (
    select g::date as day,
           count(o.id) filter (where o.status <> 'cancelled') as orders,
           coalesce(sum(o.total_xof) filter (where o.status = 'completed'), 0) as revenue
    from generate_series(v_period_start, v_today, interval '1 day') g
    left join o on o.d = g::date
    group by g
  ),
  statuses as (
    select status, count(*) as n from o where d >= v_period_start group by status
  ),
  top_p as (
    select oi.product_name as name,
           sum(oi.quantity)::int as qty,
           sum(oi.line_total_xof)::int as revenue
    from public.order_items oi
    join o on o.id = oi.order_id
    where o.status = 'completed' and o.d >= v_period_start
    group by oi.product_name
    order by sum(oi.quantity) desc, sum(oi.line_total_xof) desc
    limit 5
  )
  select jsonb_build_object(
    'days', v_days,
    'today', jsonb_build_object(
      'orders', k.t_orders,
      'revenue', k.t_revenue,
      'avg_basket', case when k.t_done > 0 then round(k.t_revenue::numeric / k.t_done) else 0 end
    ),
    'yesterday', jsonb_build_object(
      'orders', k.y_orders,
      'revenue', k.y_revenue,
      'avg_basket', case when k.y_done > 0 then round(k.y_revenue::numeric / k.y_done) else 0 end
    ),
    'pending', (select count(*) from public.orders where status = 'pending'),
    'period_revenue', (select coalesce(sum(revenue), 0) from series),
    'period_orders', (select coalesce(sum(orders), 0) from series),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'revenue', revenue, 'orders', orders) order by day), '[]'::jsonb) from series),
    'statuses', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from statuses),
    'top_products', (select coalesce(jsonb_agg(
      jsonb_build_object('name', name, 'qty', qty, 'revenue', revenue)
      order by qty desc, revenue desc
    ), '[]'::jsonb) from top_p)
  ) into result
  from kpi k;

  return result;
end $$;

revoke all on function public.admin_dashboard_overview(int) from public, anon;
grant execute on function public.admin_dashboard_overview(int) to authenticated;

-- Temps réel sur les commandes (le RLS reste appliqué : seuls les admins reçoivent les événements)
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null;
end $$;
