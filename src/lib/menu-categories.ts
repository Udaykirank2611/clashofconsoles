import snacks from "@/assets/cat-snacks.jpg";
import nonveg from "@/assets/cat-nonveg.jpg";
import milkshakes from "@/assets/cat-milkshakes.jpg";
import mocktails from "@/assets/cat-mocktails.jpg";
import juices from "@/assets/cat-juices.jpg";

/**
 * Bundled fallback artwork for the homepage category cards.
 * Admins can override any of these with their own image link.
 */
const FALLBACKS: Record<string, string> = {
  snacks,
  "non-veg": nonveg,
  milkshakes,
  mocktails,
  "fresh-juices": juices,
  lassi: milkshakes,
};

export const categoryCover = (slug: string, imageUrl?: string | null) =>
  imageUrl || FALLBACKS[slug] || snacks;

/** Maps a homepage category card to the menu categories it represents. */
export const MENU_CATEGORY_FOR_SLUG: Record<string, string> = {
  snacks: "Veg",
  "non-veg": "Non-Veg",
  milkshakes: "Milkshakes",
  mocktails: "Mocktails",
  "fresh-juices": "Fresh Juices",
  lassi: "Lassi",
};
