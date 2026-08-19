import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TemplateKey = "booking_placed" | "booking_confirmed";

export interface MessageTemplate {
  id: string;
  branch_id: string;
  template_key: TemplateKey;
  body: string;
}

export const TEMPLATE_LABEL: Record<TemplateKey, string> = {
  booking_placed: "When a booking is placed",
  booking_confirmed: "After the booking is confirmed",
};

export const TEMPLATE_HINT: Record<TemplateKey, string> = {
  booking_placed: "Sent while the guest still has to pay / while you verify the payment.",
  booking_confirmed: "Sent once you approve the payment and confirm the slot.",
};

/** Placeholders an admin may drop into a template. */
export const PLACEHOLDERS = [
  "{name}",
  "{branch}",
  "{reference}",
  "{date}",
  "{time}",
  "{total}",
  "{phone}",
  "{details}",
] as const;

export const DEFAULT_TEMPLATE: Record<TemplateKey, string> = {
  booking_placed: `Hi {name}! 👋 We have received your booking request at Clash of Consoles {branch}.
Booking ID: {reference}
Date: {date}
Time: {time}
Amount: {total}
Please complete the payment to lock your slot. We will confirm as soon as it is verified. 🎮`,
  booking_confirmed: `Hi {name}! Your booking at Clash of Consoles {branch} is CONFIRMED ✅
{details}
Please arrive 10 minutes early. See you at the arena!`,
};

/** Substitutes {placeholders}; unknown ones are left untouched. */
export function renderTemplate(body: string, vars: Record<string, string>) {
  return body
    .replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key]! : match))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** All branch message templates, keyed by `branchId:templateKey`. */
export function useMessageTemplates() {
  const [map, setMap] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("message_templates")
      .select("id, branch_id, template_key, body");
    const next: Record<string, string> = {};
    for (const row of (data ?? []) as unknown as MessageTemplate[]) {
      next[`${row.branch_id}:${row.template_key}`] = row.body;
    }
    setMap(next);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("message-templates")
      .on("postgres_changes", { event: "*", schema: "public", table: "message_templates" }, () =>
        void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const template = useCallback(
    (branchId: string, key: TemplateKey) => map[`${branchId}:${key}`] || DEFAULT_TEMPLATE[key],
    [map],
  );

  return { template, reload: load };
}
