/**
 * Seed foods with image_url (Pexels free photos) by food category keyword matching.
 * Only sets image_url where it is currently NULL.
 */
export const shorthands = undefined;

const px = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop`;

export const up = (pgm) => {
  // Category → Pexels photo ID mapping
  const categories = [
    // Poultry  (grilled chicken with vegetables)
    { keywords: ['chicken', 'turkey', 'duck', 'rotisserie', 'poultry'], img: px(1247677) },
    // Red meat / beef (well-done steak)
    { keywords: ['beef', 'steak', 'brisket', 'ribeye', 'sirloin', 'filet mignon', 'veal', 'lamb', 'bison', 'rabbit', 'meatball', 'jerky', 'corned beef', 'ground beef'], img: px(299347) },
    // Pork (meat with rice)
    { keywords: ['pork', 'bacon', 'ham', 'sausage', 'prosciutto', 'chorizo', 'pepperoni', 'salami', 'pulled pork'], img: px(2067418) },
    // Fish (cooked fish on plate)
    { keywords: ['salmon', 'tuna', 'cod', 'tilapia', 'trout', 'halibut', 'catfish', 'bass', 'swordfish', 'mahi', 'mackerel', 'herring', 'sardine', 'anchov', 'pollock', 'sole', 'barramundi', 'eel', 'fish'], img: px(2374946) },
    // Seafood (fried fish and vegetables)
    { keywords: ['shrimp', 'crab', 'lobster', 'scallop', 'clam', 'mussel', 'oyster', 'squid', 'octopus', 'crawfish', 'surimi', 'calamari'], img: px(1510714) },
    // Eggs (fried egg breakfast)
    { keywords: ['egg'], img: px(103124) },
    // Dairy / cheese (pasta with cheese)
    { keywords: ['cheese', 'paneer', 'halloumi', 'labneh', 'mascarpone', 'queso', 'quark'], img: px(1279330) },
    // Yogurt / dairy products (oatmeal bowl)
    { keywords: ['yogurt', 'kefir', 'cottage'], img: px(4220141) },
    // Milk / cream / butter (glass of milk)
    { keywords: ['milk', 'cream', 'butter', 'half and half', 'evaporated', 'condensed'], img: px(2198626) },
    // Rice / grains (rice and vegetables dish)
    { keywords: ['rice', 'quinoa', 'couscous', 'bulgur', 'barley', 'millet', 'farro', 'grain'], img: px(17910326) },
    // Pasta (pasta with tomato and basil)
    { keywords: ['pasta', 'noodle', 'spaghetti', 'macaroni', 'penne', 'ramen'], img: px(1279330) },
    // Bread (sliced loaf bread)
    { keywords: ['bread', 'tortilla', 'pita', 'bagel', 'muffin', 'croissant', 'wrap', 'cracker', 'biscuit', 'waffle', 'pancake'], img: px(162846) },
    // Oats / cereal (oatmeal with fruits)
    { keywords: ['oat', 'cereal', 'granola'], img: px(4220141) },
    // Vegetables (vegetable stir fry)
    { keywords: ['broccoli', 'spinach', 'carrot', 'tomato', 'potato', 'pepper', 'onion', 'garlic', 'asparagus', 'zucchini', 'cucumber', 'celery', 'lettuce', 'kale', 'cabbage', 'cauliflower', 'corn', 'pea', 'bean', 'lentil', 'chickpea', 'eggplant', 'mushroom', 'artichoke', 'squash', 'yam', 'sweet potato', 'beetroot', 'radish', 'turnip'], img: px(2181151) },
    // Fruits (assorted sliced fruits)
    { keywords: ['banana', 'apple', 'orange', 'grape', 'mango', 'pineapple', 'melon', 'watermelon', 'pear', 'peach', 'plum', 'cherry', 'kiwi', 'pomegranate', 'fig', 'date', 'raisin', 'coconut', 'papaya', 'guava', 'lychee', 'fruit'], img: px(1128678) },
    // Berries (blueberries and strawberries)
    { keywords: ['berry', 'blueberry', 'strawberry', 'raspberry', 'blackberry', 'cranberry'], img: px(1120575) },
    // Nuts and seeds (oatmeal with nuts)
    { keywords: ['almond', 'walnut', 'peanut', 'cashew', 'pistachio', 'pecan', 'macadamia', 'hazelnut', 'nut', 'seed', 'chia', 'flax', 'sunflower', 'pumpkin seed'], img: px(4220141) },
    // Oils & fats (glass of milk / neutral)
    { keywords: ['oil', 'olive oil', 'coconut oil', 'avocado oil'], img: px(2198626) },
  ];

  for (const { keywords, img } of categories) {
    const conditions = keywords.map(kw => `lower(name) LIKE '%${kw}%'`).join(' OR ');
    pgm.sql(`UPDATE foods SET image_url = '${img}' WHERE (${conditions}) AND image_url IS NULL;`);
  }
};

export const down = (pgm) => {
  pgm.sql(`UPDATE foods SET image_url = NULL;`);
};
