create or replace function public.sync_ticket_sold_counts() returns trigger language plpgsql security definer set search_path=public as $$
declare tt uuid[]; ev uuid[];
begin
  tt := array_remove(array[case when tg_op<>'INSERT' then old.ticket_type_id end, case when tg_op<>'DELETE' then new.ticket_type_id end], null);
  ev := array_remove(array[case when tg_op<>'INSERT' then old.event_id end, case when tg_op<>'DELETE' then new.event_id end], null);
  update ticket_types t set sold = (select coalesce(sum(quantity),0) from tickets where ticket_type_id=t.id and status in ('confirmed','paid')) where t.id = any(tt);
  update events e set tickets_sold = (select coalesce(sum(quantity),0) from tickets where event_id=e.id and status in ('confirmed','paid')) where e.id = any(ev);
  return null;
end $$;
revoke execute on function public.sync_ticket_sold_counts() from public, anon, authenticated;
drop trigger if exists trg_sync_ticket_sold_counts on public.tickets;
create trigger trg_sync_ticket_sold_counts after insert or update of status, ticket_type_id, quantity or delete on public.tickets for each row execute function public.sync_ticket_sold_counts();
update ticket_types t set sold = (select coalesce(sum(quantity),0) from tickets where ticket_type_id=t.id and status in ('confirmed','paid'));
update events e set tickets_sold = (select coalesce(sum(quantity),0) from tickets where event_id=e.id and status in ('confirmed','paid'));