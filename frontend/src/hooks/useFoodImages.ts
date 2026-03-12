/**
 * Lightweight food image lookup by keyword matching.
 * Uses the same Pexels free images seeded in the foods table.
 * No API calls – instant, works offline.
 */

const px = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop`;

// Ordered: more-specific keywords first so "chicken breast" matches "chicken" before "breast"
const FOOD_IMAGE_MAP: [string, string][] = [
  // Poultry
  ['chicken', px(1247677)],
  ['turkey', px(1247677)],
  ['duck', px(1247677)],
  ['rotisserie', px(1247677)],
  // Red meat
  ['beef', px(299347)],
  ['steak', px(299347)],
  ['brisket', px(299347)],
  ['ribeye', px(299347)],
  ['sirloin', px(299347)],
  ['filet mignon', px(299347)],
  ['veal', px(299347)],
  ['lamb', px(299347)],
  ['bison', px(299347)],
  // Pork
  ['pork', px(2067418)],
  ['bacon', px(2067418)],
  ['ham', px(2067418)],
  ['sausage', px(2067418)],
  ['prosciutto', px(2067418)],
  ['chorizo', px(2067418)],
  ['pepperoni', px(2067418)],
  ['salami', px(2067418)],
  // Fish & seafood
  ['salmon', px(2374946)],
  ['tuna', px(2374946)],
  ['cod', px(2374946)],
  ['tilapia', px(2374946)],
  ['trout', px(2374946)],
  ['halibut', px(2374946)],
  ['fish', px(2374946)],
  ['shrimp', px(1510714)],
  ['crab', px(1510714)],
  ['lobster', px(1510714)],
  ['scallop', px(1510714)],
  ['mussel', px(1510714)],
  ['oyster', px(1510714)],
  ['squid', px(1510714)],
  ['seafood', px(1510714)],
  // Eggs
  ['egg', px(103124)],
  // Dairy
  ['cheese', px(1279330)],
  ['yogurt', px(4220141)],
  ['milk', px(2198626)],
  ['cream', px(2198626)],
  ['butter', px(2198626)],
  ['cottage', px(1279330)],
  ['ricotta', px(1279330)],
  ['paneer', px(1279330)],
  // Grains & starches
  ['rice', px(17910326)],
  ['pasta', px(1279330)],
  ['bread', px(162846)],
  ['oat', px(4220141)],
  ['cereal', px(4220141)],
  ['tortilla', px(162846)],
  ['quinoa', px(17910326)],
  ['couscous', px(17910326)],
  // Vegetables
  ['broccoli', px(2181151)],
  ['spinach', px(2181151)],
  ['carrot', px(2181151)],
  ['tomato', px(2181151)],
  ['potato', px(2181151)],
  ['pepper', px(2181151)],
  ['onion', px(2181151)],
  ['avocado', px(2181151)],
  ['vegetable', px(2181151)],
  ['salad', px(2181151)],
  ['lettuce', px(2181151)],
  ['kale', px(2181151)],
  ['cucumber', px(2181151)],
  ['celery', px(2181151)],
  // Fruits
  ['banana', px(1128678)],
  ['apple', px(1128678)],
  ['orange', px(1128678)],
  ['berry', px(1120575)],
  ['blueberry', px(1120575)],
  ['strawberry', px(1120575)],
  ['grape', px(1128678)],
  ['mango', px(1128678)],
  ['melon', px(1128678)],
  ['pear', px(1128678)],
  ['fruit', px(1128678)],
  // Nuts & seeds
  ['almond', px(4220141)],
  ['walnut', px(4220141)],
  ['peanut', px(4220141)],
  ['cashew', px(4220141)],
  ['nut', px(4220141)],
  ['seed', px(4220141)],
  // Prepared / other
  ['pizza', px(1279330)],
  ['burger', px(299347)],
  ['sandwich', px(162846)],
  ['wrap', px(162846)],
  ['soup', px(2181151)],
  ['smoothie', px(2198626)],
  ['protein', px(4220141)],
  ['bar', px(4220141)],
  // Ground meat fallback
  ['ground', px(299347)],
  ['meatball', px(299347)],
  ['jerky', px(299347)],
];

export function getFoodImageUrl(name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [keyword, url] of FOOD_IMAGE_MAP) {
    if (lower.includes(keyword)) return url;
  }
  return undefined;
}
