import {
  DEFAULT_TEMPLATE,
  renderTemplate,
  type LoyaltyTemplateKey,
} from "@/lib/message-templates";

/** Which editable template applies to a customer's current standing. */
export function loyaltyTemplateKey(visits: number, rewardAvailable: boolean): LoyaltyTemplateKey {
  if (rewardAvailable) return "loyalty_reward";
  if (visits <= 0) return "loyalty_visit_0";
  if (visits > 10) return "loyalty_visit_10plus";
  return `loyalty_visit_${visits}` as LoyaltyTemplateKey;
}

/** Visit-milestone WhatsApp thank-you messages for the admin customer roster. */
export function loyaltyMessage(input: {
  name: string;
  visits: number;
  rewardAvailable: boolean;
  rewardMinutes: number | null;
  /** Admin-edited body; falls back to the shipped default. */
  body?: string;
}) {
  const name = input.name?.trim() || "there";
  const v = input.visits;
  const reward = input.rewardMinutes ?? (v >= 10 ? 60 : 30);
  const key = loyaltyTemplateKey(v, input.rewardAvailable);
  const left = v < 5 ? 5 - v : v < 10 ? 10 - v : 0;

  return renderTemplate(input.body || DEFAULT_TEMPLATE[key], {
    name,
    visits: String(v),
    left: String(left),
    reward: reward >= 60 ? "1 Hour FREE gaming" : `${reward} Minutes FREE gaming`,
  });
}

/** WhatsApp chat link for an Indian mobile number with the message pre-filled. */
export function whatsappLink(phone: string, message: string) {
  const digits = (phone || "").replace(/\D/g, "");
  const e164 = digits.length === 10 ? `91${digits}` : digits.replace(/^0+/, "");
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}
