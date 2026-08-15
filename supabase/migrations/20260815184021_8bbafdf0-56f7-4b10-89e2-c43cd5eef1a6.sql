alter table public.bookings replica identity full;
alter table public.admin_notifications replica identity full;
alter table public.gaming_stations replica identity full;
alter table public.booking_transactions replica identity full;
do $$
declare t text;
begin
  foreach t in array array['bookings','admin_notifications','gaming_stations','menu_items','session_options','group_pass_rates','coupons','branches','booking_transactions','membership_passes'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;