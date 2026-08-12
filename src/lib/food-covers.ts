import burgerImg from "@/assets/food-burger.jpg";
import pizzaImg from "@/assets/food-pizza.jpg";
import friesImg from "@/assets/food-fries.jpg";
import drinkImg from "@/assets/food-drink.jpg";
import shakeImg from "@/assets/food-shake.jpg";
import popcornImg from "@/assets/food-popcorn.jpg";

/** Fallback cover art keyed by keyword — used only when no admin image link is set. */
const COVERS: { match: string[]; img: string }[] = [
  { match: ["burger"], img: burgerImg },
  { match: ["pizza"], img: pizzaImg },
  { match: ["fries", "fry"], img: friesImg },
  { match: ["coffee", "shake", "milk"], img: shakeImg },
  { match: ["popcorn", "nacho"], img: popcornImg },
];

export const coverFor = (name: string) =>
  COVERS.find((c) => c.match.some((m) => name.toLowerCase().includes(m)))?.img ?? drinkImg;
