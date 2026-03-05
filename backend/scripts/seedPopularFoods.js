/**
 * Seed the foods table with ~500 curated foods (per 100g/100ml nutrition).
 * This is the primary food data source — no USDA or Open Food Facts needed.
 *
 * Run from repo root: node backend/scripts/seedPopularFoods.js
 * Or from backend:    node scripts/seedPopularFoods.js
 * Or via npm:         cd backend && npm run seed:foods
 *
 * Requires DATABASE_URL (e.g. in backend/.env).
 */

import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

// Per 100g/100ml: calories, protein, carbs, fat.
// Optional: is_liquid (default false), preparation (default 'cooked')

// ─────────────────────────────────────────────────────────────────────────────
// MEATS
// ─────────────────────────────────────────────────────────────────────────────
const MEATS = [
  { name: 'Chicken breast, cooked', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: 'Chicken breast, raw', calories: 120, protein: 22.5, carbs: 0, fat: 2.6, preparation: 'uncooked' },
  { name: 'Chicken thigh, cooked', calories: 209, protein: 26, carbs: 0, fat: 10.9 },
  { name: 'Chicken thigh, raw', calories: 177, protein: 17.3, carbs: 0, fat: 12.6, preparation: 'uncooked' },
  { name: 'Chicken wings, cooked', calories: 203, protein: 30.5, carbs: 0, fat: 8.1 },
  { name: 'Chicken drumstick, cooked', calories: 172, protein: 28.3, carbs: 0, fat: 5.7 },
  { name: 'Chicken tenders, breaded', calories: 271, protein: 18, carbs: 15, fat: 15 },
  { name: 'Rotisserie chicken', calories: 184, protein: 25, carbs: 0, fat: 8.5 },
  { name: 'Turkey breast, cooked', calories: 135, protein: 30, carbs: 0, fat: 0.7 },
  { name: 'Ground turkey, cooked', calories: 170, protein: 21, carbs: 0, fat: 9.4 },
  { name: 'Duck breast, cooked', calories: 201, protein: 23.5, carbs: 0, fat: 11.2 },
  { name: 'Ground beef, cooked', calories: 250, protein: 26, carbs: 0, fat: 15 },
  { name: 'Ground beef, lean, cooked', calories: 217, protein: 26, carbs: 0, fat: 11.7 },
  { name: 'Beef steak, sirloin', calories: 206, protein: 26, carbs: 0, fat: 10.6 },
  { name: 'Beef steak, ribeye', calories: 291, protein: 24, carbs: 0, fat: 21 },
  { name: 'Beef steak, filet mignon', calories: 267, protein: 26, carbs: 0, fat: 17 },
  { name: 'Beef brisket, cooked', calories: 246, protein: 26.5, carbs: 0, fat: 15 },
  { name: 'Beef ribs, cooked', calories: 291, protein: 24, carbs: 0, fat: 21 },
  { name: 'Beef jerky', calories: 410, protein: 33, carbs: 11, fat: 26 },
  { name: 'Corned beef', calories: 251, protein: 18, carbs: 0.5, fat: 19 },
  { name: 'Veal, cooked', calories: 172, protein: 31, carbs: 0, fat: 4.8 },
  { name: 'Lamb chop, cooked', calories: 258, protein: 25.5, carbs: 0, fat: 17 },
  { name: 'Lamb, ground, cooked', calories: 283, protein: 24.8, carbs: 0, fat: 19.7 },
  { name: 'Pork chop, cooked', calories: 231, protein: 26, carbs: 0, fat: 14 },
  { name: 'Pork tenderloin, cooked', calories: 143, protein: 26, carbs: 0, fat: 3.5 },
  { name: 'Pork ribs, cooked', calories: 277, protein: 23, carbs: 0, fat: 20 },
  { name: 'Bacon, cooked', calories: 541, protein: 37, carbs: 1.4, fat: 42 },
  { name: 'Ham, cooked', calories: 145, protein: 21, carbs: 1.5, fat: 5.5 },
  { name: 'Sausage, pork', calories: 301, protein: 18, carbs: 0, fat: 25 },
  { name: 'Sausage, Italian', calories: 304, protein: 14, carbs: 4, fat: 25 },
  { name: 'Pepperoni', calories: 494, protein: 22, carbs: 2, fat: 44 },
  { name: 'Salami', calories: 425, protein: 22, carbs: 2, fat: 37 },
  { name: 'Deli turkey', calories: 104, protein: 18, carbs: 4, fat: 1.6 },
  { name: 'Deli ham', calories: 120, protein: 18, carbs: 2, fat: 4.5 },
  { name: 'Liver, beef, cooked', calories: 175, protein: 26, carbs: 5.1, fat: 4.7 },
  { name: 'Chicken liver, cooked', calories: 167, protein: 24, carbs: 0.9, fat: 6.5 },
];

// ─────────────────────────────────────────────────────────────────────────────
// FISH & SEAFOOD
// ─────────────────────────────────────────────────────────────────────────────
const FISH_SEAFOOD = [
  { name: 'Salmon, cooked', calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: 'Salmon, raw', calories: 142, protein: 19.8, carbs: 0, fat: 6.3, preparation: 'uncooked' },
  { name: 'Tuna, canned in water', calories: 116, protein: 26, carbs: 0, fat: 0.8 },
  { name: 'Tuna, fresh, cooked', calories: 184, protein: 30, carbs: 0, fat: 6.3 },
  { name: 'Tilapia, cooked', calories: 128, protein: 26, carbs: 0, fat: 2.7 },
  { name: 'Cod, cooked', calories: 105, protein: 23, carbs: 0, fat: 0.9 },
  { name: 'Halibut, cooked', calories: 140, protein: 27, carbs: 0, fat: 2.9 },
  { name: 'Trout, cooked', calories: 168, protein: 24, carbs: 0, fat: 7.5 },
  { name: 'Catfish, cooked', calories: 144, protein: 18, carbs: 0, fat: 7.6 },
  { name: 'Sea bass, cooked', calories: 124, protein: 24, carbs: 0, fat: 2.6 },
  { name: 'Swordfish, cooked', calories: 174, protein: 28, carbs: 0, fat: 5.7 },
  { name: 'Mahi-mahi, cooked', calories: 109, protein: 24, carbs: 0, fat: 0.9 },
  { name: 'Mackerel, cooked', calories: 262, protein: 24, carbs: 0, fat: 18 },
  { name: 'Herring, cooked', calories: 203, protein: 23, carbs: 0, fat: 12 },
  { name: 'Sardines, canned', calories: 208, protein: 25, carbs: 0, fat: 11 },
  { name: 'Anchovies', calories: 210, protein: 29, carbs: 0, fat: 10 },
  { name: 'Pollock, cooked', calories: 111, protein: 23, carbs: 0, fat: 1.2 },
  { name: 'Shrimp, cooked', calories: 99, protein: 24, carbs: 0.2, fat: 0.3 },
  { name: 'Crab, cooked', calories: 97, protein: 19, carbs: 0, fat: 1.5 },
  { name: 'Lobster, cooked', calories: 98, protein: 21, carbs: 0, fat: 0.6 },
  { name: 'Scallops, cooked', calories: 111, protein: 21, carbs: 3.2, fat: 0.8 },
  { name: 'Clams, cooked', calories: 148, protein: 26, carbs: 5.1, fat: 2 },
  { name: 'Mussels, cooked', calories: 172, protein: 24, carbs: 7.4, fat: 4.5 },
  { name: 'Oysters, cooked', calories: 163, protein: 17, carbs: 7.5, fat: 5.7 },
  { name: 'Squid, cooked', calories: 175, protein: 18, carbs: 7.8, fat: 7.5 },
  { name: 'Octopus, cooked', calories: 164, protein: 30, carbs: 4.4, fat: 2.1 },
];

// ─────────────────────────────────────────────────────────────────────────────
// EGGS & DAIRY
// ─────────────────────────────────────────────────────────────────────────────
const DAIRY_EGGS = [
  { name: 'Eggs, whole cooked', calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  { name: 'Egg whites', calories: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  { name: 'Egg yolk', calories: 322, protein: 16, carbs: 3.6, fat: 27 },
  { name: 'Milk, whole', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, is_liquid: true },
  { name: 'Milk, 2%', calories: 50, protein: 3.3, carbs: 4.7, fat: 2, is_liquid: true },
  { name: 'Milk, skim', calories: 34, protein: 3.4, carbs: 5, fat: 0.1, is_liquid: true },
  { name: 'Almond milk, unsweetened', calories: 13, protein: 0.4, carbs: 0.6, fat: 1.1, is_liquid: true },
  { name: 'Oat milk', calories: 48, protein: 1, carbs: 7, fat: 1.5, is_liquid: true },
  { name: 'Soy milk', calories: 33, protein: 2.8, carbs: 1.8, fat: 1.6, is_liquid: true },
  { name: 'Coconut milk, canned', calories: 197, protein: 2.2, carbs: 2.8, fat: 21, is_liquid: true },
  { name: 'Half and half', calories: 130, protein: 2.6, carbs: 4.3, fat: 12, is_liquid: true },
  { name: 'Heavy cream', calories: 340, protein: 2.1, carbs: 2.8, fat: 36, is_liquid: true },
  { name: 'Whipped cream', calories: 257, protein: 3.2, carbs: 12, fat: 22 },
  { name: 'Sour cream', calories: 198, protein: 2.4, carbs: 4.6, fat: 19 },
  { name: 'Yogurt, plain whole milk', calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3 },
  { name: 'Yogurt, Greek plain', calories: 97, protein: 9, carbs: 3.5, fat: 5 },
  { name: 'Yogurt, Greek nonfat', calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  { name: 'Cheddar cheese', calories: 403, protein: 25, carbs: 1.3, fat: 33 },
  { name: 'Mozzarella cheese', calories: 280, protein: 28, carbs: 3.1, fat: 17 },
  { name: 'Parmesan cheese', calories: 431, protein: 38, carbs: 4.1, fat: 29 },
  { name: 'Swiss cheese', calories: 380, protein: 27, carbs: 5.4, fat: 28 },
  { name: 'Gouda cheese', calories: 356, protein: 25, carbs: 2.2, fat: 27 },
  { name: 'Brie cheese', calories: 334, protein: 21, carbs: 0.5, fat: 28 },
  { name: 'Feta cheese', calories: 264, protein: 14, carbs: 4.1, fat: 21 },
  { name: 'Ricotta cheese', calories: 174, protein: 11, carbs: 3, fat: 13 },
  { name: 'Cottage cheese', calories: 98, protein: 11, carbs: 3.4, fat: 4.3 },
  { name: 'Cream cheese', calories: 342, protein: 5.9, carbs: 4.1, fat: 34 },
  { name: 'Goat cheese', calories: 364, protein: 22, carbs: 0.1, fat: 30 },
  { name: 'American cheese', calories: 307, protein: 18, carbs: 3.5, fat: 25 },
  { name: 'Butter', calories: 717, protein: 0.9, carbs: 0.1, fat: 81 },
  { name: 'Evaporated milk', calories: 134, protein: 6.8, carbs: 10, fat: 7.6, is_liquid: true },
  { name: 'Condensed milk, sweetened', calories: 321, protein: 8.1, carbs: 54, fat: 8.7, is_liquid: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// GRAINS & STARCHES
// ─────────────────────────────────────────────────────────────────────────────
const GRAINS = [
  { name: 'White rice, cooked', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: 'Brown rice, cooked', calories: 112, protein: 2.6, carbs: 24, fat: 0.9 },
  { name: 'Rice, uncooked', calories: 365, protein: 7.1, carbs: 80, fat: 0.7, preparation: 'uncooked' },
  { name: 'Basmati rice, cooked', calories: 121, protein: 3.5, carbs: 25, fat: 0.4 },
  { name: 'Pasta, cooked', calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  { name: 'Pasta, whole wheat, cooked', calories: 124, protein: 5.3, carbs: 24, fat: 0.5 },
  { name: 'Pasta, uncooked', calories: 371, protein: 13, carbs: 75, fat: 1.5, preparation: 'uncooked' },
  { name: 'Rice noodles, cooked', calories: 109, protein: 0.9, carbs: 25, fat: 0.2 },
  { name: 'Egg noodles, cooked', calories: 138, protein: 4.5, carbs: 25, fat: 2.1 },
  { name: 'Oatmeal, cooked', calories: 68, protein: 2.4, carbs: 12, fat: 1.4 },
  { name: 'Oats, uncooked', calories: 389, protein: 17, carbs: 66, fat: 6.9, preparation: 'uncooked' },
  { name: 'Quinoa, cooked', calories: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  { name: 'Couscous, cooked', calories: 112, protein: 3.8, carbs: 23, fat: 0.2 },
  { name: 'Bulgur, cooked', calories: 83, protein: 3.1, carbs: 19, fat: 0.2 },
  { name: 'Farro, cooked', calories: 120, protein: 4, carbs: 26, fat: 0.7 },
  { name: 'Polenta, cooked', calories: 85, protein: 2, carbs: 18, fat: 0.5 },
  { name: 'Cornmeal', calories: 362, protein: 8.1, carbs: 77, fat: 3.6, preparation: 'uncooked' },
  { name: 'Bread, white', calories: 265, protein: 9, carbs: 49, fat: 3.2 },
  { name: 'Bread, whole wheat', calories: 247, protein: 10.7, carbs: 41, fat: 3.4 },
  { name: 'Sourdough bread', calories: 274, protein: 10, carbs: 51, fat: 3.5 },
  { name: 'Rye bread', calories: 258, protein: 8.5, carbs: 48, fat: 3.3 },
  { name: 'Pita bread', calories: 275, protein: 9.1, carbs: 55, fat: 1.2 },
  { name: 'Naan bread', calories: 290, protein: 9, carbs: 48, fat: 6 },
  { name: 'Bagel, plain', calories: 257, protein: 10, carbs: 50, fat: 1.5 },
  { name: 'English muffin', calories: 227, protein: 8, carbs: 44, fat: 1.8 },
  { name: 'Croissant', calories: 406, protein: 8.2, carbs: 45, fat: 21 },
  { name: 'Tortilla, flour', calories: 304, protein: 8.5, carbs: 49.7, fat: 7.4 },
  { name: 'Tortilla, corn', calories: 218, protein: 5.7, carbs: 44, fat: 2.9 },
  { name: 'Cornbread', calories: 296, protein: 6, carbs: 42, fat: 11 },
  { name: 'Crackers, saltine', calories: 421, protein: 9, carbs: 74, fat: 9 },
  { name: 'Crackers, whole wheat', calories: 443, protein: 10, carbs: 65, fat: 16 },
  { name: 'Potato, baked', calories: 93, protein: 2.5, carbs: 21, fat: 0.1 },
  { name: 'Sweet potato, baked', calories: 90, protein: 2, carbs: 21, fat: 0.1 },
  { name: 'French fries', calories: 312, protein: 3.4, carbs: 41, fat: 15 },
  { name: 'Mashed potatoes', calories: 113, protein: 2, carbs: 16, fat: 4.4 },
  { name: 'Hash browns', calories: 326, protein: 3.2, carbs: 35, fat: 20 },
  { name: 'Pancake', calories: 227, protein: 6.4, carbs: 28, fat: 10 },
  { name: 'Waffle', calories: 291, protein: 7.9, carbs: 33, fat: 14 },
  { name: 'French toast', calories: 229, protein: 8, carbs: 24, fat: 11 },
];

// ─────────────────────────────────────────────────────────────────────────────
// FRUITS
// ─────────────────────────────────────────────────────────────────────────────
const FRUITS = [
  { name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: 'Orange', calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
  { name: 'Strawberries', calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  { name: 'Blueberries', calories: 57, protein: 0.7, carbs: 14, fat: 0.3 },
  { name: 'Raspberries', calories: 52, protein: 1.2, carbs: 12, fat: 0.7 },
  { name: 'Blackberries', calories: 43, protein: 1.4, carbs: 10, fat: 0.5 },
  { name: 'Cranberries', calories: 46, protein: 0.4, carbs: 12, fat: 0.1 },
  { name: 'Grapes', calories: 69, protein: 0.7, carbs: 18, fat: 0.2 },
  { name: 'Watermelon', calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2 },
  { name: 'Cantaloupe', calories: 34, protein: 0.8, carbs: 8.2, fat: 0.2 },
  { name: 'Honeydew', calories: 36, protein: 0.5, carbs: 9.1, fat: 0.1 },
  { name: 'Mango', calories: 60, protein: 0.8, carbs: 15, fat: 0.4 },
  { name: 'Pineapple', calories: 50, protein: 0.5, carbs: 13, fat: 0.1 },
  { name: 'Peach', calories: 39, protein: 0.9, carbs: 10, fat: 0.3 },
  { name: 'Pear', calories: 57, protein: 0.4, carbs: 15, fat: 0.1 },
  { name: 'Plum', calories: 46, protein: 0.7, carbs: 11, fat: 0.3 },
  { name: 'Cherries', calories: 50, protein: 1, carbs: 12, fat: 0.3 },
  { name: 'Kiwi', calories: 61, protein: 1.1, carbs: 15, fat: 0.5 },
  { name: 'Papaya', calories: 43, protein: 0.5, carbs: 11, fat: 0.3 },
  { name: 'Grapefruit', calories: 42, protein: 0.8, carbs: 11, fat: 0.1 },
  { name: 'Tangerine', calories: 53, protein: 0.8, carbs: 13, fat: 0.3 },
  { name: 'Lemon', calories: 29, protein: 1.1, carbs: 9.3, fat: 0.3 },
  { name: 'Lime', calories: 30, protein: 0.7, carbs: 11, fat: 0.2 },
  { name: 'Pomegranate', calories: 83, protein: 1.7, carbs: 19, fat: 1.2 },
  { name: 'Passion fruit', calories: 97, protein: 2.2, carbs: 23, fat: 0.7 },
  { name: 'Guava', calories: 68, protein: 2.6, carbs: 14, fat: 1 },
  { name: 'Apricot', calories: 48, protein: 1.4, carbs: 11, fat: 0.4 },
  { name: 'Coconut, fresh', calories: 354, protein: 3.3, carbs: 15, fat: 33 },
  { name: 'Figs, fresh', calories: 74, protein: 0.8, carbs: 19, fat: 0.3 },
  { name: 'Dates', calories: 277, protein: 1.8, carbs: 75, fat: 0.2 },
  { name: 'Raisins', calories: 299, protein: 3.1, carbs: 79, fat: 0.5 },
  { name: 'Dried cranberries', calories: 325, protein: 0.1, carbs: 82, fat: 1.4 },
  { name: 'Dried apricots', calories: 241, protein: 3.4, carbs: 63, fat: 0.5 },
];

// ─────────────────────────────────────────────────────────────────────────────
// VEGETABLES
// ─────────────────────────────────────────────────────────────────────────────
const VEGETABLES = [
  { name: 'Broccoli, cooked', calories: 35, protein: 2.4, carbs: 7, fat: 0.4 },
  { name: 'Broccoli, raw', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, preparation: 'uncooked' },
  { name: 'Cauliflower, cooked', calories: 23, protein: 1.8, carbs: 4.1, fat: 0.5 },
  { name: 'Spinach, raw', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, preparation: 'uncooked' },
  { name: 'Spinach, cooked', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.3 },
  { name: 'Kale, raw', calories: 35, protein: 2.9, carbs: 4.4, fat: 1.5, preparation: 'uncooked' },
  { name: 'Lettuce, romaine', calories: 17, protein: 1.2, carbs: 3.3, fat: 0.3 },
  { name: 'Lettuce, iceberg', calories: 14, protein: 0.9, carbs: 3, fat: 0.1 },
  { name: 'Arugula', calories: 25, protein: 2.6, carbs: 3.7, fat: 0.7, preparation: 'uncooked' },
  { name: 'Collard greens, cooked', calories: 33, protein: 2.7, carbs: 5.4, fat: 0.4 },
  { name: 'Carrots, raw', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, preparation: 'uncooked' },
  { name: 'Carrots, cooked', calories: 35, protein: 0.8, carbs: 8.2, fat: 0.2 },
  { name: 'Tomato, raw', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, preparation: 'uncooked' },
  { name: 'Cherry tomatoes', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, preparation: 'uncooked' },
  { name: 'Cucumber', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, preparation: 'uncooked' },
  { name: 'Bell pepper, raw', calories: 31, protein: 1, carbs: 6, fat: 0.3, preparation: 'uncooked' },
  { name: 'Jalapeño pepper', calories: 29, protein: 0.9, carbs: 6.5, fat: 0.4, preparation: 'uncooked' },
  { name: 'Onion, raw', calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, preparation: 'uncooked' },
  { name: 'Garlic', calories: 149, protein: 6.5, carbs: 33, fat: 0.5 },
  { name: 'Ginger, raw', calories: 80, protein: 1.8, carbs: 18, fat: 0.8, preparation: 'uncooked' },
  { name: 'Green beans, cooked', calories: 31, protein: 1.8, carbs: 7, fat: 0.1 },
  { name: 'Peas, cooked', calories: 84, protein: 5.4, carbs: 15, fat: 0.2 },
  { name: 'Snap peas', calories: 42, protein: 2.8, carbs: 7.6, fat: 0.2, preparation: 'uncooked' },
  { name: 'Corn, cooked', calories: 96, protein: 3.4, carbs: 21, fat: 1.5 },
  { name: 'Zucchini', calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3 },
  { name: 'Eggplant, cooked', calories: 35, protein: 0.8, carbs: 9, fat: 0.2 },
  { name: 'Mushrooms, raw', calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, preparation: 'uncooked' },
  { name: 'Mushrooms, cooked', calories: 28, protein: 3.6, carbs: 4.4, fat: 0.5 },
  { name: 'Asparagus, cooked', calories: 22, protein: 2.4, carbs: 4, fat: 0.2 },
  { name: 'Brussels sprouts, cooked', calories: 36, protein: 2.6, carbs: 7, fat: 0.5 },
  { name: 'Cabbage, raw', calories: 25, protein: 1.3, carbs: 5.8, fat: 0.1, preparation: 'uncooked' },
  { name: 'Cabbage, cooked', calories: 23, protein: 1.3, carbs: 5.5, fat: 0.1 },
  { name: 'Celery, raw', calories: 14, protein: 0.7, carbs: 3, fat: 0.2, preparation: 'uncooked' },
  { name: 'Artichoke, cooked', calories: 47, protein: 3.3, carbs: 11, fat: 0.2 },
  { name: 'Radish', calories: 16, protein: 0.7, carbs: 3.4, fat: 0.1, preparation: 'uncooked' },
  { name: 'Turnip, cooked', calories: 22, protein: 0.7, carbs: 5.1, fat: 0.1 },
  { name: 'Beets, cooked', calories: 44, protein: 1.7, carbs: 10, fat: 0.2 },
  { name: 'Butternut squash, cooked', calories: 40, protein: 0.9, carbs: 10, fat: 0.1 },
  { name: 'Okra, cooked', calories: 22, protein: 1.9, carbs: 4.5, fat: 0.2 },
  { name: 'Bok choy, cooked', calories: 12, protein: 1.6, carbs: 1.8, fat: 0.2 },
  { name: 'Edamame', calories: 121, protein: 12, carbs: 9, fat: 5.2 },
  { name: 'Leeks, cooked', calories: 31, protein: 0.8, carbs: 7.6, fat: 0.2 },
  { name: 'Avocado', calories: 160, protein: 2, carbs: 9, fat: 15, preparation: 'uncooked' },
  { name: 'Olives, green', calories: 145, protein: 1, carbs: 3.8, fat: 15 },
  { name: 'Olives, black', calories: 115, protein: 0.8, carbs: 6, fat: 11 },
  { name: 'Corn on the cob', calories: 96, protein: 3.4, carbs: 21, fat: 1.5 },
];

// ─────────────────────────────────────────────────────────────────────────────
// LEGUMES
// ─────────────────────────────────────────────────────────────────────────────
const LEGUMES = [
  { name: 'Black beans, cooked', calories: 132, protein: 8.9, carbs: 24, fat: 0.5 },
  { name: 'Kidney beans, cooked', calories: 127, protein: 8.7, carbs: 22, fat: 0.5 },
  { name: 'Pinto beans, cooked', calories: 143, protein: 9, carbs: 26, fat: 0.7 },
  { name: 'White beans, cooked', calories: 139, protein: 9.7, carbs: 25, fat: 0.4 },
  { name: 'Navy beans, cooked', calories: 140, protein: 8.2, carbs: 26, fat: 0.6 },
  { name: 'Lima beans, cooked', calories: 115, protein: 7.8, carbs: 21, fat: 0.4 },
  { name: 'Fava beans, cooked', calories: 110, protein: 7.6, carbs: 20, fat: 0.4 },
  { name: 'Chickpeas, cooked', calories: 164, protein: 8.9, carbs: 27, fat: 2.6 },
  { name: 'Lentils, cooked', calories: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: 'Green lentils, cooked', calories: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: 'Red lentils, cooked', calories: 116, protein: 7.6, carbs: 20, fat: 0.4 },
  { name: 'Split peas, cooked', calories: 118, protein: 8.3, carbs: 21, fat: 0.4 },
  { name: 'Soybeans, cooked', calories: 173, protein: 17, carbs: 10, fat: 9 },
  { name: 'Tofu, firm', calories: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  { name: 'Tofu, silken', calories: 55, protein: 5, carbs: 2.4, fat: 2.7 },
  { name: 'Tempeh', calories: 192, protein: 20, carbs: 7.6, fat: 11 },
];

// ─────────────────────────────────────────────────────────────────────────────
// NUTS & SEEDS
// ─────────────────────────────────────────────────────────────────────────────
const NUTS_SEEDS = [
  { name: 'Almonds', calories: 579, protein: 21, carbs: 22, fat: 50 },
  { name: 'Walnuts', calories: 654, protein: 15, carbs: 14, fat: 65 },
  { name: 'Cashews', calories: 553, protein: 18, carbs: 30, fat: 44 },
  { name: 'Pecans', calories: 691, protein: 9.2, carbs: 14, fat: 72 },
  { name: 'Pistachios', calories: 560, protein: 20, carbs: 28, fat: 45 },
  { name: 'Macadamia nuts', calories: 718, protein: 7.9, carbs: 14, fat: 76 },
  { name: 'Hazelnuts', calories: 628, protein: 15, carbs: 17, fat: 61 },
  { name: 'Brazil nuts', calories: 659, protein: 14, carbs: 12, fat: 67 },
  { name: 'Pine nuts', calories: 673, protein: 14, carbs: 13, fat: 68 },
  { name: 'Peanuts', calories: 567, protein: 26, carbs: 16, fat: 49 },
  { name: 'Peanut butter', calories: 588, protein: 25, carbs: 20, fat: 50 },
  { name: 'Almond butter', calories: 614, protein: 21, carbs: 19, fat: 56 },
  { name: 'Tahini', calories: 595, protein: 17, carbs: 21, fat: 54 },
  { name: 'Sunflower seeds', calories: 584, protein: 21, carbs: 20, fat: 51 },
  { name: 'Pumpkin seeds', calories: 559, protein: 30, carbs: 11, fat: 49 },
  { name: 'Chia seeds', calories: 486, protein: 17, carbs: 42, fat: 31 },
  { name: 'Flaxseeds', calories: 534, protein: 18, carbs: 29, fat: 42 },
  { name: 'Hemp seeds', calories: 553, protein: 32, carbs: 9, fat: 49 },
  { name: 'Sesame seeds', calories: 573, protein: 18, carbs: 23, fat: 50 },
  { name: 'Coconut, shredded', calories: 660, protein: 6.9, carbs: 24, fat: 65 },
];

// ─────────────────────────────────────────────────────────────────────────────
// OILS & FATS
// ─────────────────────────────────────────────────────────────────────────────
const OILS_FATS = [
  { name: 'Olive oil', calories: 884, protein: 0, carbs: 0, fat: 100 },
  { name: 'Vegetable oil', calories: 884, protein: 0, carbs: 0, fat: 100 },
  { name: 'Coconut oil', calories: 862, protein: 0, carbs: 0, fat: 100 },
  { name: 'Avocado oil', calories: 884, protein: 0, carbs: 0, fat: 100 },
  { name: 'Sesame oil', calories: 884, protein: 0, carbs: 0, fat: 100 },
  { name: 'Canola oil', calories: 884, protein: 0, carbs: 0, fat: 100 },
  { name: 'Ghee', calories: 900, protein: 0, carbs: 0, fat: 100 },
  { name: 'Lard', calories: 902, protein: 0, carbs: 0, fat: 100 },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONDIMENTS & SAUCES
// ─────────────────────────────────────────────────────────────────────────────
const CONDIMENTS = [
  { name: 'Ketchup', calories: 112, protein: 1.8, carbs: 26, fat: 0.1 },
  { name: 'Mustard', calories: 66, protein: 4.4, carbs: 5.3, fat: 3 },
  { name: 'Mayonnaise', calories: 680, protein: 1.1, carbs: 0.6, fat: 75 },
  { name: 'Soy sauce', calories: 53, protein: 5.6, carbs: 6, fat: 0, is_liquid: true },
  { name: 'BBQ sauce', calories: 172, protein: 0.8, carbs: 40, fat: 0.6 },
  { name: 'Hot sauce', calories: 11, protein: 0.6, carbs: 1.8, fat: 0.4, is_liquid: true },
  { name: 'Sriracha', calories: 93, protein: 2, carbs: 19, fat: 1 },
  { name: 'Teriyaki sauce', calories: 89, protein: 5.9, carbs: 16, fat: 0, is_liquid: true },
  { name: 'Ranch dressing', calories: 459, protein: 1.7, carbs: 6, fat: 48 },
  { name: 'Italian dressing', calories: 193, protein: 0.3, carbs: 8, fat: 18 },
  { name: 'Vinaigrette', calories: 215, protein: 0, carbs: 8, fat: 20 },
  { name: 'Balsamic vinegar', calories: 88, protein: 0.5, carbs: 17, fat: 0, is_liquid: true },
  { name: 'Pesto', calories: 387, protein: 5.6, carbs: 6, fat: 38 },
  { name: 'Marinara sauce', calories: 50, protein: 1.5, carbs: 8, fat: 1.5 },
  { name: 'Tomato sauce', calories: 29, protein: 1.3, carbs: 5.4, fat: 0.2 },
  { name: 'Hoisin sauce', calories: 220, protein: 3.4, carbs: 44, fat: 3.4 },
  { name: 'Fish sauce', calories: 35, protein: 5.1, carbs: 3.6, fat: 0, is_liquid: true },
  { name: 'Worcestershire sauce', calories: 78, protein: 0, carbs: 19, fat: 0, is_liquid: true },
  { name: 'Tartar sauce', calories: 298, protein: 0.6, carbs: 10, fat: 29 },
  { name: 'Relish, sweet pickle', calories: 130, protein: 0.3, carbs: 32, fat: 0.7 },
  { name: 'Salsa', calories: 36, protein: 1.5, carbs: 7, fat: 0.2 },
  { name: 'Hummus', calories: 166, protein: 7.9, carbs: 14.3, fat: 9.6 },
  { name: 'Guacamole', calories: 157, protein: 1.9, carbs: 8.5, fat: 14 },
  { name: 'Tzatziki', calories: 55, protein: 3.4, carbs: 4, fat: 2.8 },
  { name: 'Honey', calories: 304, protein: 0, carbs: 82, fat: 0, is_liquid: true },
  { name: 'Maple syrup', calories: 260, protein: 0, carbs: 67, fat: 0, is_liquid: true },
  { name: 'Sugar, white', calories: 387, protein: 0, carbs: 100, fat: 0 },
  { name: 'Brown sugar', calories: 380, protein: 0, carbs: 98, fat: 0 },
  { name: 'Jam', calories: 250, protein: 0.4, carbs: 66, fat: 0.1 },
  { name: 'Nutella', calories: 539, protein: 6.3, carbs: 58, fat: 31 },
];

// ─────────────────────────────────────────────────────────────────────────────
// BEVERAGES
// ─────────────────────────────────────────────────────────────────────────────
const BEVERAGES = [
  { name: 'Water', calories: 0, protein: 0, carbs: 0, fat: 0, is_liquid: true },
  { name: 'Coffee, black', calories: 2, protein: 0.1, carbs: 0, fat: 0, is_liquid: true },
  { name: 'Espresso', calories: 9, protein: 0.1, carbs: 1.7, fat: 0.2, is_liquid: true },
  { name: 'Tea, brewed', calories: 1, protein: 0, carbs: 0.2, fat: 0, is_liquid: true },
  { name: 'Green tea', calories: 1, protein: 0, carbs: 0.2, fat: 0, is_liquid: true },
  { name: 'Hot chocolate', calories: 77, protein: 3.6, carbs: 10, fat: 2.3, is_liquid: true },
  { name: 'Orange juice', calories: 45, protein: 0.7, carbs: 10, fat: 0.2, is_liquid: true },
  { name: 'Apple juice', calories: 46, protein: 0.1, carbs: 11, fat: 0.1, is_liquid: true },
  { name: 'Cranberry juice', calories: 46, protein: 0, carbs: 12, fat: 0.1, is_liquid: true },
  { name: 'Grape juice', calories: 60, protein: 0.4, carbs: 15, fat: 0.1, is_liquid: true },
  { name: 'Lemonade', calories: 40, protein: 0, carbs: 10, fat: 0, is_liquid: true },
  { name: 'Iced tea, sweetened', calories: 33, protein: 0, carbs: 8.5, fat: 0, is_liquid: true },
  { name: 'Cola', calories: 42, protein: 0, carbs: 10.6, fat: 0, is_liquid: true },
  { name: 'Diet soda', calories: 0, protein: 0, carbs: 0, fat: 0, is_liquid: true },
  { name: 'Sprite / lemon-lime soda', calories: 41, protein: 0, carbs: 10.2, fat: 0, is_liquid: true },
  { name: 'Energy drink', calories: 45, protein: 0, carbs: 11, fat: 0, is_liquid: true },
  { name: 'Sports drink', calories: 26, protein: 0, carbs: 6.4, fat: 0, is_liquid: true },
  { name: 'Coconut water', calories: 19, protein: 0.7, carbs: 3.7, fat: 0.2, is_liquid: true },
  { name: 'Kombucha', calories: 17, protein: 0, carbs: 3, fat: 0, is_liquid: true },
  { name: 'Beer', calories: 43, protein: 0.5, carbs: 3.6, fat: 0, is_liquid: true },
  { name: 'Beer, light', calories: 29, protein: 0.2, carbs: 1.3, fat: 0, is_liquid: true },
  { name: 'Wine, red', calories: 85, protein: 0.1, carbs: 2.6, fat: 0, is_liquid: true },
  { name: 'Wine, white', calories: 82, protein: 0.1, carbs: 2.6, fat: 0, is_liquid: true },
  { name: 'Whiskey', calories: 250, protein: 0, carbs: 0, fat: 0, is_liquid: true },
  { name: 'Vodka', calories: 231, protein: 0, carbs: 0, fat: 0, is_liquid: true },
  { name: 'Green smoothie', calories: 45, protein: 1.5, carbs: 9, fat: 0.5, is_liquid: true },
  { name: 'Protein shake', calories: 120, protein: 24, carbs: 3, fat: 1, is_liquid: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// SNACKS & SWEETS
// ─────────────────────────────────────────────────────────────────────────────
const SNACKS = [
  { name: 'Potato chips', calories: 536, protein: 7, carbs: 53, fat: 35 },
  { name: 'Tortilla chips', calories: 489, protein: 7.2, carbs: 63, fat: 24 },
  { name: 'Popcorn, air-popped', calories: 387, protein: 13, carbs: 78, fat: 4.5 },
  { name: 'Popcorn, buttered', calories: 535, protein: 9, carbs: 55, fat: 31 },
  { name: 'Pretzels', calories: 381, protein: 9, carbs: 80, fat: 3.5 },
  { name: 'Trail mix', calories: 462, protein: 14, carbs: 45, fat: 29 },
  { name: 'Rice cake', calories: 387, protein: 8.2, carbs: 82, fat: 2.8 },
  { name: 'Granola', calories: 471, protein: 10, carbs: 64, fat: 20 },
  { name: 'Granola bar', calories: 471, protein: 8, carbs: 64, fat: 20 },
  { name: 'Cereal, corn flakes', calories: 357, protein: 7.2, carbs: 84, fat: 0.7 },
  { name: 'Cereal, oatmeal', calories: 389, protein: 16.9, carbs: 66, fat: 6.9 },
  { name: 'Dark chocolate', calories: 546, protein: 4.9, carbs: 61, fat: 31 },
  { name: 'Milk chocolate', calories: 535, protein: 8, carbs: 59, fat: 30 },
  { name: 'White chocolate', calories: 539, protein: 5.9, carbs: 59, fat: 32 },
  { name: 'Candy bar', calories: 488, protein: 4.2, carbs: 64, fat: 25 },
  { name: 'Gummy bears', calories: 343, protein: 6.9, carbs: 77, fat: 0 },
  { name: 'Ice cream, vanilla', calories: 207, protein: 3.5, carbs: 24, fat: 11 },
  { name: 'Ice cream, chocolate', calories: 216, protein: 3.8, carbs: 28, fat: 11 },
  { name: 'Frozen yogurt', calories: 159, protein: 3.5, carbs: 29, fat: 3.5 },
  { name: 'Cookie, chocolate chip', calories: 502, protein: 5.7, carbs: 64, fat: 24 },
  { name: 'Brownie', calories: 466, protein: 5.6, carbs: 54, fat: 25 },
  { name: 'Cake, chocolate', calories: 389, protein: 5.3, carbs: 50, fat: 19 },
  { name: 'Cheesecake', calories: 321, protein: 5.5, carbs: 26, fat: 22 },
  { name: 'Donut, glazed', calories: 421, protein: 5.2, carbs: 51, fat: 22 },
  { name: 'Muffin, blueberry', calories: 377, protein: 5, carbs: 52, fat: 16 },
  { name: 'Apple pie', calories: 237, protein: 1.9, carbs: 34, fat: 11 },
  { name: 'Pudding, chocolate', calories: 119, protein: 2.8, carbs: 21, fat: 3.1 },
  { name: 'Popsicle', calories: 65, protein: 0, carbs: 17, fat: 0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMMON PREPARED FOODS
// ─────────────────────────────────────────────────────────────────────────────
const COMMON_FOODS = [
  { name: 'Pizza, cheese', calories: 266, protein: 11, carbs: 33, fat: 10 },
  { name: 'Pizza, pepperoni', calories: 274, protein: 12, carbs: 26, fat: 13 },
  { name: 'Hamburger', calories: 254, protein: 17, carbs: 24, fat: 10 },
  { name: 'Cheeseburger', calories: 303, protein: 17, carbs: 25, fat: 16 },
  { name: 'Hot dog', calories: 290, protein: 10, carbs: 4.2, fat: 26 },
  { name: 'Chicken nuggets', calories: 296, protein: 15, carbs: 16, fat: 21 },
  { name: 'Fried chicken', calories: 307, protein: 22, carbs: 11, fat: 20 },
  { name: 'Grilled cheese sandwich', calories: 358, protein: 14, carbs: 28, fat: 22 },
  { name: 'BLT sandwich', calories: 235, protein: 10, carbs: 21, fat: 12 },
  { name: 'Chicken wrap', calories: 182, protein: 13, carbs: 19, fat: 6 },
  { name: 'Taco, beef', calories: 226, protein: 9, carbs: 20, fat: 12 },
  { name: 'Burrito, bean', calories: 222, protein: 7.5, carbs: 32, fat: 7 },
  { name: 'Quesadilla, cheese', calories: 295, protein: 12, carbs: 25, fat: 17 },
  { name: 'Sushi roll, salmon', calories: 143, protein: 6.1, carbs: 20, fat: 3.8 },
  { name: 'Sushi roll, tuna', calories: 136, protein: 6.5, carbs: 19, fat: 3.5 },
  { name: 'Ramen noodle soup', calories: 54, protein: 2.6, carbs: 7.9, fat: 1.5, is_liquid: true },
  { name: 'Chicken noodle soup', calories: 36, protein: 2.4, carbs: 3.5, fat: 1.7, is_liquid: true },
  { name: 'Tomato soup', calories: 40, protein: 1.1, carbs: 6.6, fat: 1.2, is_liquid: true },
  { name: 'Mac and cheese', calories: 164, protein: 7, carbs: 18, fat: 7 },
  { name: 'Fried rice', calories: 163, protein: 4.5, carbs: 22, fat: 6 },
  { name: 'Caesar salad', calories: 94, protein: 6, carbs: 5, fat: 6 },
  { name: 'Coleslaw', calories: 99, protein: 1, carbs: 11, fat: 6 },
  { name: 'Falafel', calories: 333, protein: 13, carbs: 32, fat: 18 },
  { name: 'Spring roll, fried', calories: 237, protein: 6, carbs: 24, fat: 13 },
  { name: 'Onion rings', calories: 332, protein: 4.4, carbs: 39, fat: 18 },
  { name: 'Mozzarella sticks', calories: 312, protein: 13, carbs: 25, fat: 18 },
  { name: 'Fish sticks', calories: 290, protein: 12, carbs: 24, fat: 17 },
  { name: 'Egg fried rice', calories: 174, protein: 5, carbs: 24, fat: 6.5 },
  { name: 'Pad Thai', calories: 129, protein: 5, carbs: 17, fat: 4.5 },
  { name: 'Stir fry, chicken', calories: 120, protein: 14, carbs: 6, fat: 5 },
];

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLEMENTS & PROTEIN
// ─────────────────────────────────────────────────────────────────────────────
const SUPPLEMENTS = [
  { name: 'Protein bar', calories: 400, protein: 30, carbs: 35, fat: 15 },
  { name: 'Whey protein powder', calories: 381, protein: 75, carbs: 10, fat: 5 },
  { name: 'Casein protein powder', calories: 375, protein: 70, carbs: 12, fat: 4 },
  { name: 'Plant protein powder', calories: 370, protein: 70, carbs: 15, fat: 5 },
  { name: 'Creatine monohydrate', calories: 0, protein: 0, carbs: 0, fat: 0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Combine all
// ─────────────────────────────────────────────────────────────────────────────
const ALL_FOODS = [
  ...MEATS,
  ...FISH_SEAFOOD,
  ...DAIRY_EGGS,
  ...GRAINS,
  ...FRUITS,
  ...VEGETABLES,
  ...LEGUMES,
  ...NUTS_SEEDS,
  ...OILS_FATS,
  ...CONDIMENTS,
  ...BEVERAGES,
  ...SNACKS,
  ...COMMON_FOODS,
  ...SUPPLEMENTS,
];

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required. Set it in backend/.env');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE TABLE foods');
    console.log('Truncated foods table.');

    const batchSize = 25;
    const COLS = 9;
    for (let i = 0; i < ALL_FOODS.length; i += batchSize) {
      const batch = ALL_FOODS.slice(i, i + batchSize);
      const values = batch.flatMap((r) => [
        r.name,
        r.name,  // common_name = name (curated names are already clean)
        r.calories,
        r.protein,
        r.carbs,
        r.fat,
        r.is_liquid ?? false,
        r.preparation ?? 'cooked',
        'curated',
      ]);
      const placeholders = batch
        .map(
          (_, j) => {
            const o = j * COLS;
            return `($${o+1}, $${o+2}, $${o+3}, $${o+4}, $${o+5}, $${o+6}, $${o+7}, $${o+8}, $${o+9})`;
          }
        )
        .join(', ');
      await client.query(
        `INSERT INTO foods (name, common_name, calories, protein, carbs, fat, is_liquid, preparation, source)
         VALUES ${placeholders}`,
        values
      );
      console.log('Inserted', Math.min(i + batchSize, ALL_FOODS.length), 'of', ALL_FOODS.length);
    }

    // Populate full-text search vector
    await client.query(`UPDATE foods SET name_tsv = to_tsvector('english', name) WHERE name_tsv IS NULL`);
    console.log('Updated name_tsv for full-text search.');

    console.log('Done. Total foods:', ALL_FOODS.length);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
