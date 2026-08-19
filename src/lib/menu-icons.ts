import {
  Beef,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Drumstick,
  EggFried,
  Fish,
  GlassWater,
  IceCreamCone,
  Leaf,
  Milk,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Soup,
  Utensils,
  type LucideIcon,
} from "lucide-react";

/** Keyword → icon, checked in order against the item name. */
const NAME_RULES: Array<[RegExp, LucideIcon]> = [
  [/pizza/i, Pizza],
  [/burger|sandwich|toast|roll|wrap|shawarma/i, Sandwich],
  [/chicken|wings|drumstick|tandoor|kebab|tikka/i, Drumstick],
  [/mutton|beef|meat|keema/i, Beef],
  [/fish|prawn|seafood/i, Fish],
  [/egg|omelette|omlet/i, EggFried],
  [/fries|nugget|popcorn|pop corn|chips/i, Popcorn],
  [/noodle|maggi|soup|pasta|ramen/i, Soup],
  [/salad|veg\b|paneer|corn/i, Salad],
  [/milkshake|shake|lassi|milk/i, Milk],
  [/ice ?cream|sundae|falooda/i, IceCreamCone],
  [/coffee|latte|cappuccino|espresso|tea|chai/i, Coffee],
  [/mocktail|mojito|soda|cola|pepsi|sprite|redbull|red bull|energy/i, CupSoda],
  [/juice|lemon|lime|orange|mango|water/i, GlassWater],
  [/cake|brownie|cookie|choco|dessert|muffin/i, Cookie],
  [/puff|samosa|bread|bun|garlic/i, Croissant],
];

/** Fallback by category when the name gives nothing away. */
const CATEGORY_RULES: Array<[RegExp, LucideIcon]> = [
  [/non-?veg/i, Drumstick],
  [/veg|snack/i, Leaf],
  [/milkshake|lassi/i, Milk],
  [/mocktail/i, CupSoda],
  [/juice/i, GlassWater],
  [/dessert|sweet/i, IceCreamCone],
  [/hot|coffee|tea/i, Coffee],
];

/** Picks a small illustrative icon for a menu item. */
export function menuItemIcon(name: string, category?: string | null): LucideIcon {
  for (const [re, Icon] of NAME_RULES) if (re.test(name)) return Icon;
  if (category) for (const [re, Icon] of CATEGORY_RULES) if (re.test(category)) return Icon;
  return Utensils;
}
