-- Limite : 3 commandes par numéro et 60 au total sur 10 minutes (hors administrateur).
create index if not exists orders_phone_created_idx
  on public.orders(customer_phone, created_at desc);

create or replace function public.enforce_order_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;

  if (select count(*) from public.orders
      where customer_phone = new.customer_phone
        and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Trop de commandes récentes avec ce numéro. Réessayez dans quelques minutes.';
  end if;

  if (select count(*) from public.orders
      where created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'Service très sollicité en ce moment. Réessayez dans quelques minutes.';
  end if;

  return new;
end $$;

drop trigger if exists orders_rate_limit on public.orders;
create trigger orders_rate_limit before insert on public.orders
  for each row execute function public.enforce_order_rate_limit();
