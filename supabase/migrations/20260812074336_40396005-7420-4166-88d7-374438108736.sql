CREATE OR REPLACE FUNCTION public.seed_branch_workspace() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE tpl uuid;
BEGIN
  SELECT id INTO tpl FROM public.branches WHERE id <> NEW.id ORDER BY sort_order LIMIT 1;
  IF tpl IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.gaming_stations (branch_id, name, station_type, description, image_url, hourly_price, status, is_addon, sort_order)
  SELECT NEW.id, name, station_type, description, image_url, hourly_price, 'available', is_addon, sort_order
  FROM public.gaming_stations WHERE branch_id = tpl;

  INSERT INTO public.session_options (branch_id, label, duration_minutes, players, price, is_active, sort_order)
  SELECT NEW.id, label, duration_minutes, players, price, is_active, sort_order
  FROM public.session_options WHERE branch_id = tpl;

  INSERT INTO public.menu_items (branch_id, name, category, description, price, is_available, sort_order)
  SELECT NEW.id, name, category, description, price, is_available, sort_order
  FROM public.menu_items WHERE branch_id = tpl;

  INSERT INTO public.membership_plans (branch_id, name, hours_included, price, validity, perks, is_popular, is_visible, sort_order, badge)
  SELECT NEW.id, name, hours_included, price, validity, perks, is_popular, is_visible, sort_order, badge
  FROM public.membership_plans WHERE branch_id = tpl;

  INSERT INTO public.experience_rates (branch_id, experience_slug, group_label, label, price, note, sort_order, is_active)
  SELECT NEW.id, experience_slug, group_label, label, price, note, sort_order, is_active
  FROM public.experience_rates WHERE branch_id = tpl;

  INSERT INTO public.site_offers (branch_id, title, subtitle, price, validity, features, discount_percent, min_bill, offer_text, is_visible)
  SELECT NEW.id, title, subtitle, price, validity, features, discount_percent, min_bill, offer_text, is_visible
  FROM public.site_offers WHERE branch_id = tpl;

  INSERT INTO public.coupons (branch_id, code, description, discount_type, value, min_order_amount, max_discount, usage_limit, starts_at, ends_at, is_active)
  SELECT NEW.id, code, description, discount_type, value, min_order_amount, max_discount, usage_limit, starts_at, ends_at, is_active
  FROM public.coupons WHERE branch_id = tpl;

  RETURN NEW;
END;
$$;