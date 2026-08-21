import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BookingTemplateKey = "booking_placed" | "booking_confirmed";

/** One editable thank-you message per completed-visit count, plus the reward one. */
export type LoyaltyTemplateKey =
  | "loyalty_reward"
  | "loyalty_visit_0"
  | "loyalty_visit_1"
  | "loyalty_visit_2"
  | "loyalty_visit_3"
  | "loyalty_visit_4"
  | "loyalty_visit_5"
  | "loyalty_visit_6"
  | "loyalty_visit_7"
  | "loyalty_visit_8"
  | "loyalty_visit_9"
  | "loyalty_visit_10"
  | "loyalty_visit_10plus";

export type TemplateKey = BookingTemplateKey | LoyaltyTemplateKey;

export const LOYALTY_KEYS: LoyaltyTemplateKey[] = [
  "loyalty_reward",
  "loyalty_visit_0",
  "loyalty_visit_1",
  "loyalty_visit_2",
  "loyalty_visit_3",
  "loyalty_visit_4",
  "loyalty_visit_5",
  "loyalty_visit_6",
  "loyalty_visit_7",
  "loyalty_visit_8",
  "loyalty_visit_9",
  "loyalty_visit_10",
  "loyalty_visit_10plus",
];

export interface MessageTemplate {
  id: string;
  branch_id: string;
  template_key: TemplateKey;
  body: string;
}

const visitLabel = (n: number) => `Thank-you message after visit ${n}`;

export const TEMPLATE_LABEL: Record<TemplateKey, string> = {
  booking_placed: "When a booking is placed",
  booking_confirmed: "After the booking is confirmed",
  loyalty_reward: "When a free-gaming reward is waiting",
  loyalty_visit_0: "Never visited yet (new number)",
  loyalty_visit_1: visitLabel(1),
  loyalty_visit_2: visitLabel(2),
  loyalty_visit_3: visitLabel(3),
  loyalty_visit_4: visitLabel(4),
  loyalty_visit_5: visitLabel(5),
  loyalty_visit_6: visitLabel(6),
  loyalty_visit_7: visitLabel(7),
  loyalty_visit_8: visitLabel(8),
  loyalty_visit_9: visitLabel(9),
  loyalty_visit_10: visitLabel(10),
  loyalty_visit_10plus: "More than 10 visits",
};

const loyaltyHint = "Shown next to the customer in the Customers tab and sent on WhatsApp.";

export const TEMPLATE_HINT: Record<TemplateKey, string> = {
  booking_placed: "Sent while the guest still has to pay / while you verify the payment.",
  booking_confirmed: "Sent once you approve the payment and confirm the slot.",
  loyalty_reward: "Takes priority whenever the customer has an unused free-gaming reward.",
  loyalty_visit_0: loyaltyHint,
  loyalty_visit_1: loyaltyHint,
  loyalty_visit_2: loyaltyHint,
  loyalty_visit_3: loyaltyHint,
  loyalty_visit_4: loyaltyHint,
  loyalty_visit_5: loyaltyHint,
  loyalty_visit_6: loyaltyHint,
  loyalty_visit_7: loyaltyHint,
  loyalty_visit_8: loyaltyHint,
  loyalty_visit_9: loyaltyHint,
  loyalty_visit_10: loyaltyHint,
  loyalty_visit_10plus: loyaltyHint,
};

/** Placeholders an admin may drop into a booking template. */
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

/** Placeholders available inside the loyalty thank-you messages. */
export const LOYALTY_PLACEHOLDERS = ["{name}", "{visits}", "{left}", "{reward}"] as const;

const untilFive = (v: number) =>
  `Thank you {name}! 🙏 That's {visits} gaming visit${v === 1 ? "" : "s"} at Clash of Consoles. Just {left} more and your 5th visit gets 30 Minutes FREE gaming! 🎮`;

const untilTen = (v: number) =>
  `Thank you {name}! 🙏 You're at {visits} gaming visits with Clash of Consoles.${v === 5 ? " 🎉" : ""} {left} more and your 10th visit gets 1 Hour FREE gaming! 🚀`;

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
  loyalty_reward: `Hurray {name}! 🎉 You've played {visits} gaming visits at Clash of Consoles — your next visit comes with {reward}! 🎮 Book now and enjoy it on that visit itself.`,
  loyalty_visit_0: `Hi {name}! 👋 Welcome to Clash of Consoles. Book your first gaming session — any game counts — and on your 5th visit you get 30 Minutes FREE! 🎮`,
  loyalty_visit_1: untilFive(1),
  loyalty_visit_2: untilFive(2),
  loyalty_visit_3: untilFive(3),
  loyalty_visit_4: `Almost there {name}! 🔥 That's {visits} gaming visits — your very next visit at Clash of Consoles gets 30 Minutes FREE gaming! 🎮`,
  loyalty_visit_5: untilTen(5),
  loyalty_visit_6: untilTen(6),
  loyalty_visit_7: untilTen(7),
  loyalty_visit_8: untilTen(8),
  loyalty_visit_9: `So close {name}! 🔥 {visits} gaming visits done — your next visit at Clash of Consoles gets 1 Hour FREE gaming! 🚀`,
  loyalty_visit_10: `Legend status {name}! 🏆 {visits} gaming visits at Clash of Consoles. Keep playing — every 10th visit comes with 1 Hour FREE gaming!`,
  loyalty_visit_10plus: `Thank you {name}! 🙏 {visits} gaming visits at Clash of Consoles — you're a true legend. 🏆 Keep playing, every 10th visit comes with 1 Hour FREE gaming!`,
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
