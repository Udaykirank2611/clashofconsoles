ALTER TABLE public.message_templates DROP CONSTRAINT IF EXISTS message_templates_template_key_check;

ALTER TABLE public.message_templates
  ADD CONSTRAINT message_templates_template_key_check
  CHECK (template_key = ANY (ARRAY[
    'booking_placed','booking_confirmed',
    'loyalty_reward','loyalty_visit_0','loyalty_visit_1','loyalty_visit_2','loyalty_visit_3',
    'loyalty_visit_4','loyalty_visit_5','loyalty_visit_6','loyalty_visit_7','loyalty_visit_8',
    'loyalty_visit_9','loyalty_visit_10','loyalty_visit_10plus'
  ]));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;