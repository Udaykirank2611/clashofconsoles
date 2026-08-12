/** Single source of truth for the arena's public contact numbers. */
export const PRIMARY_PHONE = "8522006115";
export const SECONDARY_PHONE = "9989772103";

export const telHref = (phone: string) => `tel:+91${phone}`;
export const waHref = (text: string) =>
  `https://wa.me/91${PRIMARY_PHONE}?text=${encodeURIComponent(text)}`;
export const prettyPhone = (phone: string) =>
  `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
export const CONTACT_EMAIL = "Clashofconsoles.gamingcafe@gmail.com";
export const mailHref = () => `mailto:${CONTACT_EMAIL}`;

/** Google Maps destinations per branch (also editable per branch in admin). */
export const MAPS_VANASTHALIPURAM = "https://maps.app.goo.gl/NCGPYqyS7MaEhn8E8";
export const MAPS_SHERIGUDA = "https://maps.app.goo.gl/zCnNG6QatecWmZQm9";
