/** Visit-milestone WhatsApp thank-you messages for the admin customer roster. */
export function loyaltyMessage(input: {
  name: string;
  visits: number;
  rewardAvailable: boolean;
  rewardMinutes: number | null;
}) {
  const name = input.name?.trim() || "there";
  const v = input.visits;
  const reward = input.rewardMinutes ?? (v >= 10 ? 60 : 30);
  const rewardText = reward >= 60 ? "1 Hour FREE gaming" : `${reward} Minutes FREE gaming`;

  if (input.rewardAvailable) {
    return `Hurray ${name}! 🎉 You've played ${v} gaming visit${v === 1 ? "" : "s"} at Clash of Consoles — your next visit comes with ${rewardText}! 🎮 Book now and enjoy it on that visit itself.`;
  }

  if (v <= 0) {
    return `Hi ${name}! 👋 Welcome to Clash of Consoles. Book your first gaming session — any game counts — and on your 5th visit you get 30 Minutes FREE! 🎮`;
  }

  if (v < 5) {
    const left = 5 - v;
    return `Thank you ${name}! 🙏 That's ${v} gaming visit${v > 1 ? "s" : ""} at Clash of Consoles. ${left} more visit${left > 1 ? "s" : ""} and your ${5}th visit gets 30 Minutes FREE gaming! 🎮`;
  }

  if (v < 10) {
    const left = 10 - v;
    return `Thank you ${name}! 🙏 You're at ${v} gaming visits with Clash of Consoles. ${left} more visit${left > 1 ? "s" : ""} and your 10th visit gets 1 Hour FREE gaming! 🚀`;
  }

  return `Thank you ${name}! 🙏 ${v} gaming visits at Clash of Consoles — you're a true legend. 🏆 Keep playing, every 10th visit comes with 1 Hour FREE gaming!`;
}

/** WhatsApp chat link for an Indian mobile number with the message pre-filled. */
export function whatsappLink(phone: string, message: string) {
  const digits = (phone || "").replace(/\D/g, "");
  const e164 = digits.length === 10 ? `91${digits}` : digits.replace(/^0+/, "");
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}
