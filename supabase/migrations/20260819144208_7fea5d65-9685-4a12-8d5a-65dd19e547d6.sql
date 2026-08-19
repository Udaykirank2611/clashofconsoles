CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  template_key text NOT NULL CHECK (template_key IN ('booking_placed','booking_confirmed')),
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, template_key)
);

GRANT SELECT ON public.message_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Message templates are readable"
  ON public.message_templates FOR SELECT
  USING (true);

CREATE POLICY "Branch staff manage message templates"
  ON public.message_templates FOR ALL
  TO authenticated
  USING (private.has_branch_access(auth.uid(), branch_id))
  WITH CHECK (private.has_branch_access(auth.uid(), branch_id));

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.message_templates (branch_id, template_key, body)
SELECT b.id, 'booking_placed',
'Hi {name}! 👋 We have received your booking request at Clash of Consoles {branch}.
Booking ID: {reference}
Date: {date}
Time: {time}
Amount: {total}
Please complete the payment to lock your slot. We will confirm as soon as it is verified. 🎮'
FROM public.branches b
ON CONFLICT (branch_id, template_key) DO NOTHING;

INSERT INTO public.message_templates (branch_id, template_key, body)
SELECT b.id, 'booking_confirmed',
'Hi {name}! Your booking at Clash of Consoles {branch} is CONFIRMED ✅
{details}
Please arrive 10 minutes early. See you at the arena!'
FROM public.branches b
ON CONFLICT (branch_id, template_key) DO NOTHING;