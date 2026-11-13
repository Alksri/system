/* ==========================================================================
   SYSTEM PORTAL — Nutrition reference data
   Values are standard reference values per 100 g (raw/cooked as noted in name
   or serving). Sources basis: common IFCT / USDA-style reference values used
   for diet planning. Actual values vary by recipe, brand, ripeness and method.
   Per-gram and per-serving amounts in the app are calculated from these.
   ========================================================================== */
(function () {
  'use strict';

  // Nutrients per 100 g: kcal, protein(g), carbs(g), fat(g), fiber(g),
  // calcium(mg), iron(mg), vitA(mcg RAE), vitC(mg), folate(mcg), potassium(mg)
  var FOODS = [
    // ---- Indian dishes (typical cooked preparations, per 100 g) ----
    { name: 'Roti / Chapati (whole wheat)', category: 'Indian Dish', kcal: 297, protein: 11.0, carbs: 46.0, fat: 7.0, fiber: 4.9, calcium: 93, iron: 3.0, vitA: 0, vitC: 0, folate: 36, potassium: 196 },
    { name: 'Plain Paratha', category: 'Indian Dish', kcal: 326, protein: 6.4, carbs: 45.4, fat: 13.2, fiber: 3.0, calcium: 25, iron: 1.8, vitA: 0, vitC: 0, folate: 18, potassium: 120 },
    { name: 'Aloo Paratha', category: 'Indian Dish', kcal: 250, protein: 5.2, carbs: 37.0, fat: 9.2, fiber: 3.4, calcium: 22, iron: 1.6, vitA: 5, vitC: 6, folate: 20, potassium: 260 },
    { name: 'Plain Rice (cooked)', category: 'Indian Dish', kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4, calcium: 10, iron: 0.2, vitA: 0, vitC: 0, folate: 3, potassium: 35 },
    { name: 'Jeera Rice (cooked)', category: 'Indian Dish', kcal: 150, protein: 2.8, carbs: 27.5, fat: 3.2, fiber: 0.5, calcium: 12, iron: 0.5, vitA: 0, vitC: 0, folate: 4, potassium: 45 },
    { name: 'Vegetable Pulao', category: 'Indian Dish', kcal: 165, protein: 3.5, carbs: 26.0, fat: 5.2, fiber: 1.8, calcium: 20, iron: 0.8, vitA: 120, vitC: 8, folate: 18, potassium: 130 },
    { name: 'Vegetable Biryani', category: 'Indian Dish', kcal: 175, protein: 4.0, carbs: 25.0, fat: 6.5, fiber: 2.2, calcium: 28, iron: 1.0, vitA: 110, vitC: 7, folate: 20, potassium: 150 },
    { name: 'Chicken Biryani', category: 'Indian Dish', kcal: 205, protein: 10.5, carbs: 22.0, fat: 8.0, fiber: 1.2, calcium: 22, iron: 1.2, vitA: 35, vitC: 3, folate: 12, potassium: 170 },
    { name: 'Khichdi (moong dal, cooked)', category: 'Indian Dish', kcal: 120, protein: 4.5, carbs: 20.0, fat: 2.2, fiber: 2.0, calcium: 18, iron: 1.1, vitA: 10, vitC: 1, folate: 40, potassium: 160 },
    { name: 'Dal Tadka (cooked)', category: 'Indian Dish', kcal: 105, protein: 5.5, carbs: 13.0, fat: 3.2, fiber: 3.5, calcium: 25, iron: 1.8, vitA: 20, vitC: 2, folate: 60, potassium: 280 },
    { name: 'Dal Makhani', category: 'Indian Dish', kcal: 150, protein: 6.0, carbs: 14.0, fat: 7.5, fiber: 4.0, calcium: 40, iron: 2.2, vitA: 60, vitC: 1, folate: 55, potassium: 300 },
    { name: 'Chana Masala', category: 'Indian Dish', kcal: 145, protein: 6.5, carbs: 18.0, fat: 5.0, fiber: 5.5, calcium: 45, iron: 2.4, vitA: 30, vitC: 6, folate: 120, potassium: 320 },
    { name: 'Rajma (kidney bean curry)', category: 'Indian Dish', kcal: 140, protein: 7.0, carbs: 17.0, fat: 4.5, fiber: 6.0, calcium: 40, iron: 2.3, vitA: 5, vitC: 4, folate: 110, potassium: 340 },
    { name: 'Palak Paneer', category: 'Indian Dish', kcal: 170, protein: 7.5, carbs: 6.0, fat: 12.5, fiber: 2.2, calcium: 180, iron: 2.0, vitA: 450, vitC: 12, folate: 90, potassium: 320 },
    { name: 'Paneer Butter Masala', category: 'Indian Dish', kcal: 265, protein: 9.0, carbs: 8.0, fat: 21.0, fiber: 1.2, calcium: 200, iron: 1.0, vitA: 320, vitC: 5, folate: 20, potassium: 140 },
    { name: 'Shahi Paneer', category: 'Indian Dish', kcal: 280, protein: 8.5, carbs: 9.0, fat: 23.0, fiber: 1.0, calcium: 190, iron: 0.9, vitA: 280, vitC: 4, folate: 18, potassium: 130 },
    { name: 'Matar Paneer', category: 'Indian Dish', kcal: 190, protein: 8.0, carbs: 10.0, fat: 12.5, fiber: 2.8, calcium: 150, iron: 1.6, vitA: 120, vitC: 10, folate: 45, potassium: 220 },
    { name: 'Aloo Gobi', category: 'Indian Dish', kcal: 110, protein: 2.5, carbs: 13.0, fat: 5.5, fiber: 3.0, calcium: 25, iron: 0.8, vitA: 15, vitC: 28, folate: 35, potassium: 320 },
    { name: 'Bhindi Masala', category: 'Indian Dish', kcal: 95, protein: 2.2, carbs: 8.5, fat: 6.0, fiber: 3.5, calcium: 80, iron: 0.8, vitA: 35, vitC: 18, folate: 60, potassium: 280 },
    { name: 'Baingan Bharta', category: 'Indian Dish', kcal: 100, protein: 1.8, carbs: 9.0, fat: 6.5, fiber: 3.2, calcium: 20, iron: 0.6, vitA: 20, vitC: 5, folate: 22, potassium: 220 },
    { name: 'Mixed Vegetable Curry', category: 'Indian Dish', kcal: 90, protein: 2.5, carbs: 10.0, fat: 4.5, fiber: 3.0, calcium: 30, iron: 1.0, vitA: 200, vitC: 15, folate: 35, potassium: 240 },
    { name: 'Sambar', category: 'Indian Dish', kcal: 65, protein: 2.8, carbs: 9.5, fat: 1.8, fiber: 2.5, calcium: 30, iron: 1.0, vitA: 80, vitC: 8, folate: 30, potassium: 220 },
    { name: 'Rasam', category: 'Indian Dish', kcal: 35, protein: 1.2, carbs: 5.5, fat: 1.0, fiber: 1.2, calcium: 20, iron: 0.6, vitA: 60, vitC: 12, folate: 12, potassium: 180 },
    { name: 'Curd Rice', category: 'Indian Dish', kcal: 135, protein: 3.8, carbs: 22.0, fat: 3.5, fiber: 0.4, calcium: 90, iron: 0.3, vitA: 30, vitC: 1, folate: 8, potassium: 110 },
    { name: 'Idli (steamed)', category: 'Indian Dish', kcal: 130, protein: 4.0, carbs: 26.0, fat: 0.8, fiber: 1.5, calcium: 20, iron: 0.7, vitA: 0, vitC: 0, folate: 15, potassium: 90 },
    { name: 'Plain Dosa', category: 'Indian Dish', kcal: 170, protein: 4.0, carbs: 30.0, fat: 3.5, fiber: 1.4, calcium: 15, iron: 0.8, vitA: 0, vitC: 0, folate: 12, potassium: 85 },
    { name: 'Masala Dosa', category: 'Indian Dish', kcal: 210, protein: 5.0, carbs: 34.0, fat: 6.0, fiber: 2.2, calcium: 20, iron: 1.2, vitA: 10, vitC: 5, folate: 20, potassium: 220 },
    { name: 'Uttapam', category: 'Indian Dish', kcal: 160, protein: 4.5, carbs: 28.0, fat: 3.2, fiber: 2.0, calcium: 22, iron: 1.0, vitA: 40, vitC: 6, folate: 18, potassium: 140 },
    { name: 'Upma (semolina)', category: 'Indian Dish', kcal: 150, protein: 3.5, carbs: 24.0, fat: 4.5, fiber: 1.8, calcium: 18, iron: 1.0, vitA: 30, vitC: 4, folate: 25, potassium: 120 },
    { name: 'Poha', category: 'Indian Dish', kcal: 180, protein: 3.0, carbs: 30.0, fat: 5.5, fiber: 2.0, calcium: 15, iron: 2.5, vitA: 10, vitC: 8, folate: 20, potassium: 110 },
    { name: 'Besan Chilla', category: 'Indian Dish', kcal: 160, protein: 8.0, carbs: 18.0, fat: 6.0, fiber: 4.0, calcium: 35, iron: 2.2, vitA: 40, vitC: 10, folate: 120, potassium: 260 },
    { name: 'Vegetable Sandwich (white bread)', category: 'Indian Dish', kcal: 220, protein: 6.5, carbs: 32.0, fat: 7.0, fiber: 3.0, calcium: 80, iron: 1.8, vitA: 90, vitC: 10, folate: 45, potassium: 180 },
    { name: 'Chicken Curry (home-style)', category: 'Indian Dish', kcal: 180, protein: 16.0, carbs: 4.0, fat: 11.0, fiber: 0.8, calcium: 20, iron: 1.4, vitA: 40, vitC: 3, folate: 10, potassium: 240 },
    { name: 'Egg Curry', category: 'Indian Dish', kcal: 160, protein: 11.0, carbs: 5.0, fat: 10.5, fiber: 0.8, calcium: 45, iron: 1.8, vitA: 140, vitC: 2, folate: 35, potassium: 160 },
    { name: 'Fish Curry (rohu-style)', category: 'Indian Dish', kcal: 140, protein: 15.0, carbs: 3.0, fat: 7.5, fiber: 0.6, calcium: 30, iron: 1.0, vitA: 25, vitC: 2, folate: 12, potassium: 280 },
    { name: 'Tandoori Chicken (no skin)', category: 'Indian Dish', kcal: 165, protein: 24.0, carbs: 2.0, fat: 6.5, fiber: 0.2, calcium: 18, iron: 1.2, vitA: 30, vitC: 2, folate: 8, potassium: 260 },
    { name: 'Mutton Curry', category: 'Indian Dish', kcal: 230, protein: 18.0, carbs: 3.0, fat: 16.0, fiber: 0.5, calcium: 15, iron: 2.2, vitA: 20, vitC: 1, folate: 8, potassium: 250 },
    { name: 'Sprouts Salad', category: 'Indian Dish', kcal: 100, protein: 7.0, carbs: 14.0, fat: 1.5, fiber: 4.5, calcium: 35, iron: 2.0, vitA: 60, vitC: 18, folate: 140, potassium: 320 },
    { name: 'Dahi / Plain Curd', category: 'Indian Dish', kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0, calcium: 121, iron: 0.1, vitA: 27, vitC: 0.5, folate: 7, potassium: 155 },
    { name: 'Lassi (sweet)', category: 'Indian Dish', kcal: 90, protein: 2.8, carbs: 14.0, fat: 2.5, fiber: 0, calcium: 100, iron: 0.1, vitA: 25, vitC: 0.5, folate: 6, potassium: 130 },
    { name: 'Buttermilk / Chaas', category: 'Indian Dish', kcal: 40, protein: 2.0, carbs: 4.5, fat: 1.0, fiber: 0, calcium: 80, iron: 0.1, vitA: 10, vitC: 0.5, folate: 5, potassium: 110 },

    // ---- Vegetables (per 100 g, raw unless common cooked noted) ----
    { name: 'Spinach (palak, raw)', category: 'Vegetable', kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, calcium: 99, iron: 2.7, vitA: 469, vitC: 28, folate: 194, potassium: 558 },
    { name: 'Potato (boiled)', category: 'Vegetable', kcal: 87, protein: 1.9, carbs: 20.1, fat: 0.1, fiber: 1.8, calcium: 5, iron: 0.3, vitA: 0, vitC: 7, folate: 9, potassium: 379 },
    { name: 'Sweet Potato (boiled)', category: 'Vegetable', kcal: 86, protein: 1.6, carbs: 20.1, fat: 0.1, fiber: 3.0, calcium: 30, iron: 0.6, vitA: 709, vitC: 2.4, folate: 6, potassium: 337 },
    { name: 'Tomato (raw)', category: 'Vegetable', kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, calcium: 10, iron: 0.3, vitA: 42, vitC: 14, folate: 15, potassium: 237 },
    { name: 'Onion (raw)', category: 'Vegetable', kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, calcium: 23, iron: 0.2, vitA: 0, vitC: 7.4, folate: 19, potassium: 146 },
    { name: 'Carrot (raw)', category: 'Vegetable', kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8, calcium: 33, iron: 0.3, vitA: 835, vitC: 5.9, folate: 19, potassium: 320 },
    { name: 'Cucumber (raw)', category: 'Vegetable', kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, calcium: 16, iron: 0.3, vitA: 5, vitC: 2.8, folate: 7, potassium: 147 },
    { name: 'Cauliflower (raw)', category: 'Vegetable', kcal: 25, protein: 1.9, carbs: 5.0, fat: 0.3, fiber: 2.0, calcium: 22, iron: 0.4, vitA: 0, vitC: 48, folate: 57, potassium: 299 },
    { name: 'Cabbage (raw)', category: 'Vegetable', kcal: 25, protein: 1.3, carbs: 5.8, fat: 0.1, fiber: 2.5, calcium: 40, iron: 0.5, vitA: 5, vitC: 36, folate: 43, potassium: 170 },
    { name: 'Broccoli (raw)', category: 'Vegetable', kcal: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6, calcium: 47, iron: 0.7, vitA: 31, vitC: 89, folate: 63, potassium: 316 },
    { name: 'Capsicum / Bell Pepper (raw)', category: 'Vegetable', kcal: 31, protein: 1.0, carbs: 6.0, fat: 0.3, fiber: 2.1, calcium: 7, iron: 0.4, vitA: 157, vitC: 128, folate: 46, potassium: 211 },
    { name: 'Brinjal / Eggplant (raw)', category: 'Vegetable', kcal: 25, protein: 1.0, carbs: 5.9, fat: 0.2, fiber: 3.0, calcium: 9, iron: 0.2, vitA: 1, vitC: 2.2, folate: 22, potassium: 229 },
    { name: 'Okra / Bhindi (raw)', category: 'Vegetable', kcal: 33, protein: 1.9, carbs: 7.5, fat: 0.2, fiber: 3.2, calcium: 82, iron: 0.6, vitA: 36, vitC: 23, folate: 60, potassium: 299 },
    { name: 'Bottle Gourd / Lauki (raw)', category: 'Vegetable', kcal: 15, protein: 0.6, carbs: 3.4, fat: 0.0, fiber: 0.5, calcium: 26, iron: 0.2, vitA: 0, vitC: 10, folate: 6, potassium: 150 },
    { name: 'Bitter Gourd / Karela (raw)', category: 'Vegetable', kcal: 17, protein: 1.0, carbs: 3.7, fat: 0.2, fiber: 2.8, calcium: 19, iron: 0.4, vitA: 24, vitC: 84, folate: 72, potassium: 296 },
    { name: 'Pumpkin (raw)', category: 'Vegetable', kcal: 26, protein: 1.0, carbs: 6.5, fat: 0.1, fiber: 0.5, calcium: 21, iron: 0.8, vitA: 426, vitC: 9, folate: 16, potassium: 340 },
    { name: 'Green Peas (raw)', category: 'Vegetable', kcal: 81, protein: 5.4, carbs: 14.5, fat: 0.4, fiber: 5.7, calcium: 25, iron: 1.5, vitA: 38, vitC: 40, folate: 65, potassium: 244 },
    { name: 'Beetroot (raw)', category: 'Vegetable', kcal: 43, protein: 1.6, carbs: 9.6, fat: 0.2, fiber: 2.8, calcium: 16, iron: 0.8, vitA: 2, vitC: 4.9, folate: 109, potassium: 325 },
    { name: 'Radish (raw)', category: 'Vegetable', kcal: 16, protein: 0.7, carbs: 3.4, fat: 0.1, fiber: 1.6, calcium: 25, iron: 0.3, vitA: 0, vitC: 15, folate: 25, potassium: 233 },
    { name: 'Mushroom (white, raw)', category: 'Vegetable', kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1.0, calcium: 3, iron: 0.5, vitA: 0, vitC: 2.1, folate: 17, potassium: 318 },
    { name: 'Sweet Corn (boiled)', category: 'Vegetable', kcal: 96, protein: 3.4, carbs: 21.0, fat: 1.5, fiber: 2.4, calcium: 3, iron: 0.5, vitA: 9, vitC: 5.5, folate: 23, potassium: 218 },
    { name: 'Drumstick / Moringa pods', category: 'Vegetable', kcal: 37, protein: 2.1, carbs: 8.5, fat: 0.2, fiber: 3.2, calcium: 30, iron: 0.4, vitA: 4, vitC: 141, folate: 44, potassium: 461 },
    { name: 'Green Beans (raw)', category: 'Vegetable', kcal: 31, protein: 1.8, carbs: 7.0, fat: 0.1, fiber: 2.7, calcium: 37, iron: 1.0, vitA: 35, vitC: 12, folate: 33, potassium: 211 },

    // ---- Fruits (per 100 g, edible portion) ----
    { name: 'Apple (with skin)', category: 'Fruit', kcal: 52, protein: 0.3, carbs: 14.0, fat: 0.2, fiber: 2.4, calcium: 6, iron: 0.1, vitA: 3, vitC: 4.6, folate: 3, potassium: 107 },
    { name: 'Banana', category: 'Fruit', kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, calcium: 5, iron: 0.3, vitA: 3, vitC: 8.7, folate: 20, potassium: 358 },
    { name: 'Mango', category: 'Fruit', kcal: 60, protein: 0.8, carbs: 15.0, fat: 0.4, fiber: 1.6, calcium: 11, iron: 0.2, vitA: 54, vitC: 36, folate: 43, potassium: 168 },
    { name: 'Orange', category: 'Fruit', kcal: 47, protein: 0.9, carbs: 11.8, fat: 0.1, fiber: 2.4, calcium: 40, iron: 0.1, vitA: 11, vitC: 53, folate: 30, potassium: 181 },
    { name: 'Mosambi / Sweet Lime', category: 'Fruit', kcal: 43, protein: 0.8, carbs: 10.9, fat: 0.3, fiber: 0.5, calcium: 33, iron: 0.7, vitA: 2, vitC: 50, folate: 10, potassium: 490 },
    { name: 'Papaya', category: 'Fruit', kcal: 43, protein: 0.5, carbs: 10.8, fat: 0.3, fiber: 1.7, calcium: 20, iron: 0.3, vitA: 47, vitC: 61, folate: 37, potassium: 182 },
    { name: 'Guava', category: 'Fruit', kcal: 68, protein: 2.6, carbs: 14.3, fat: 1.0, fiber: 5.4, calcium: 18, iron: 0.3, vitA: 31, vitC: 228, folate: 49, potassium: 417 },
    { name: 'Pomegranate', category: 'Fruit', kcal: 83, protein: 1.7, carbs: 18.7, fat: 1.2, fiber: 4.0, calcium: 10, iron: 0.3, vitA: 0, vitC: 10, folate: 38, potassium: 236 },
    { name: 'Grapes (green)', category: 'Fruit', kcal: 69, protein: 0.7, carbs: 18.1, fat: 0.2, fiber: 0.9, calcium: 10, iron: 0.4, vitA: 3, vitC: 3.2, folate: 2, potassium: 191 },
    { name: 'Watermelon', category: 'Fruit', kcal: 30, protein: 0.6, carbs: 7.6, fat: 0.2, fiber: 0.4, calcium: 7, iron: 0.2, vitA: 28, vitC: 8.1, folate: 3, potassium: 112 },
    { name: 'Muskmelon', category: 'Fruit', kcal: 34, protein: 0.8, carbs: 8.2, fat: 0.2, fiber: 0.9, calcium: 9, iron: 0.2, vitA: 169, vitC: 36, folate: 21, potassium: 267 },
    { name: 'Pineapple', category: 'Fruit', kcal: 50, protein: 0.5, carbs: 13.1, fat: 0.1, fiber: 1.4, calcium: 13, iron: 0.3, vitA: 3, vitC: 48, folate: 18, potassium: 109 },
    { name: 'Strawberry', category: 'Fruit', kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2.0, calcium: 16, iron: 0.4, vitA: 1, vitC: 59, folate: 24, potassium: 153 },
    { name: 'Kiwi', category: 'Fruit', kcal: 61, protein: 1.1, carbs: 14.7, fat: 0.5, fiber: 3.0, calcium: 34, iron: 0.3, vitA: 4, vitC: 93, folate: 25, potassium: 312 },
    { name: 'Chikoo / Sapota', category: 'Fruit', kcal: 83, protein: 0.4, carbs: 20.0, fat: 1.1, fiber: 5.3, calcium: 21, iron: 0.8, vitA: 3, vitC: 14, folate: 14, potassium: 193 },
    { name: 'Pear', category: 'Fruit', kcal: 57, protein: 0.4, carbs: 15.2, fat: 0.1, fiber: 3.1, calcium: 9, iron: 0.2, vitA: 1, vitC: 4.3, folate: 7, potassium: 116 },
    { name: 'Peach', category: 'Fruit', kcal: 39, protein: 0.9, carbs: 9.5, fat: 0.3, fiber: 1.5, calcium: 6, iron: 0.3, vitA: 16, vitC: 6.6, folate: 4, potassium: 190 },
    { name: 'Plum', category: 'Fruit', kcal: 46, protein: 0.7, carbs: 11.4, fat: 0.3, fiber: 1.4, calcium: 6, iron: 0.2, vitA: 17, vitC: 9.5, folate: 5, potassium: 157 },
    { name: 'Litchi / Lychee', category: 'Fruit', kcal: 66, protein: 0.8, carbs: 16.5, fat: 0.4, fiber: 1.3, calcium: 5, iron: 0.3, vitA: 0, vitC: 72, folate: 14, potassium: 171 },
    { name: 'Coconut (fresh meat)', category: 'Fruit', kcal: 354, protein: 3.3, carbs: 15.2, fat: 33.5, fiber: 9.0, calcium: 14, iron: 2.4, vitA: 0, vitC: 3.3, folate: 26, potassium: 356 },
    { name: 'Dates (dried)', category: 'Fruit', kcal: 282, protein: 2.5, carbs: 75.0, fat: 0.4, fiber: 8.0, calcium: 39, iron: 1.0, vitA: 7, vitC: 0.4, folate: 19, potassium: 656 },
    { name: 'Lemon (juice)', category: 'Fruit', kcal: 22, protein: 0.4, carbs: 6.9, fat: 0.2, fiber: 0.3, calcium: 6, iron: 0.1, vitA: 1, vitC: 39, folate: 13, potassium: 103 },

    // ---- Grains, dals, pulses & staples (cooked unless noted) ----
    { name: 'Oats (cooked)', category: 'Grain & Pulse', kcal: 71, protein: 2.5, carbs: 12.0, fat: 1.5, fiber: 1.7, calcium: 9, iron: 0.9, vitA: 0, vitC: 0, folate: 6, potassium: 70 },
    { name: 'Wheat Dalia (cooked)', category: 'Grain & Pulse', kcal: 83, protein: 3.0, carbs: 17.0, fat: 0.5, fiber: 2.2, calcium: 12, iron: 1.0, vitA: 0, vitC: 0, folate: 14, potassium: 90 },
    { name: 'Quinoa (cooked)', category: 'Grain & Pulse', kcal: 120, protein: 4.4, carbs: 21.3, fat: 1.9, fiber: 2.8, calcium: 17, iron: 1.5, vitA: 0, vitC: 0, folate: 42, potassium: 172 },
    { name: 'Brown Rice (cooked)', category: 'Grain & Pulse', kcal: 123, protein: 2.7, carbs: 25.6, fat: 1.0, fiber: 1.6, calcium: 3, iron: 0.5, vitA: 0, vitC: 0, folate: 9, potassium: 86 },
    { name: 'Moong Dal (cooked)', category: 'Grain & Pulse', kcal: 105, protein: 7.0, carbs: 19.0, fat: 0.4, fiber: 7.6, calcium: 27, iron: 1.4, vitA: 2, vitC: 1, folate: 159, potassium: 266 },
    { name: 'Masoor Dal (cooked)', category: 'Grain & Pulse', kcal: 116, protein: 9.0, carbs: 20.0, fat: 0.4, fiber: 7.9, calcium: 19, iron: 3.3, vitA: 2, vitC: 1.5, folate: 181, potassium: 369 },
    { name: 'Toor / Arhar Dal (cooked)', category: 'Grain & Pulse', kcal: 118, protein: 7.2, carbs: 21.0, fat: 0.6, fiber: 6.5, calcium: 23, iron: 1.6, vitA: 1, vitC: 0, folate: 111, potassium: 384 },
    { name: 'Chana Dal (cooked)', category: 'Grain & Pulse', kcal: 135, protein: 8.0, carbs: 22.0, fat: 1.8, fiber: 7.0, calcium: 45, iron: 2.6, vitA: 3, vitC: 1, folate: 172, potassium: 350 },
    { name: 'Urad Dal (cooked)', category: 'Grain & Pulse', kcal: 120, protein: 8.5, carbs: 20.0, fat: 0.6, fiber: 6.8, calcium: 35, iron: 2.8, vitA: 2, vitC: 0, folate: 110, potassium: 320 },
    { name: 'Chickpeas / Kabuli Chana (boiled)', category: 'Grain & Pulse', kcal: 164, protein: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6, calcium: 49, iron: 2.9, vitA: 1, vitC: 1.3, folate: 172, potassium: 291 },
    { name: 'Rajma / Kidney Beans (boiled)', category: 'Grain & Pulse', kcal: 127, protein: 8.7, carbs: 22.8, fat: 0.5, fiber: 6.4, calcium: 28, iron: 2.9, vitA: 0, vitC: 1.2, folate: 130, potassium: 405 },
    { name: 'Soybean (boiled)', category: 'Grain & Pulse', kcal: 173, protein: 16.6, carbs: 9.9, fat: 9.0, fiber: 6.0, calcium: 102, iron: 5.1, vitA: 1, vitC: 1.7, folate: 54, potassium: 515 },
    { name: 'Peanuts (roasted)', category: 'Grain & Pulse', kcal: 567, protein: 25.8, carbs: 16.1, fat: 49.2, fiber: 8.5, calcium: 92, iron: 4.6, vitA: 0, vitC: 0, folate: 240, potassium: 705 },

    // ---- Dairy, eggs & protein foods (per 100 g) ----
    { name: 'Milk (cow, toned)', category: 'Dairy & Protein', kcal: 58, protein: 3.1, carbs: 4.9, fat: 3.0, fiber: 0, calcium: 120, iron: 0.1, vitA: 46, vitC: 0, folate: 5, potassium: 150 },
    { name: 'Milk (buffalo)', category: 'Dairy & Protein', kcal: 97, protein: 3.7, carbs: 5.2, fat: 6.9, fiber: 0, calcium: 169, iron: 0.1, vitA: 53, vitC: 2.3, folate: 5, potassium: 178 },
    { name: 'Paneer (cottage cheese)', category: 'Dairy & Protein', kcal: 265, protein: 18.3, carbs: 1.2, fat: 20.8, fiber: 0, calcium: 208, iron: 0.2, vitA: 155, vitC: 0, folate: 15, potassium: 138 },
    { name: 'Cheddar Cheese', category: 'Dairy & Protein', kcal: 403, protein: 24.9, carbs: 1.3, fat: 33.1, fiber: 0, calcium: 721, iron: 0.7, vitA: 330, vitC: 0, folate: 27, potassium: 98 },
    { name: 'Greek Yogurt (plain)', category: 'Dairy & Protein', kcal: 59, protein: 10.3, carbs: 3.6, fat: 0.4, fiber: 0, calcium: 110, iron: 0.1, vitA: 2, vitC: 0, folate: 7, potassium: 141 },
    { name: 'Egg (boiled, whole)', category: 'Dairy & Protein', kcal: 155, protein: 12.6, carbs: 1.1, fat: 10.6, fiber: 0, calcium: 50, iron: 1.2, vitA: 149, vitC: 0, folate: 44, potassium: 126 },
    { name: 'Egg White (boiled)', category: 'Dairy & Protein', kcal: 52, protein: 10.9, carbs: 0.7, fat: 0.2, fiber: 0, calcium: 7, iron: 0.1, vitA: 0, vitC: 0, folate: 4, potassium: 163 },
    { name: 'Chicken Breast (cooked)', category: 'Dairy & Protein', kcal: 165, protein: 31.0, carbs: 0, fat: 3.6, fiber: 0, calcium: 15, iron: 1.0, vitA: 6, vitC: 0, folate: 4, potassium: 256 },
    { name: 'Chicken Thigh (cooked)', category: 'Dairy & Protein', kcal: 209, protein: 26.0, carbs: 0, fat: 10.9, fiber: 0, calcium: 13, iron: 1.3, vitA: 18, vitC: 0, folate: 5, potassium: 223 },
    { name: 'Fish - Rohu (cooked)', category: 'Dairy & Protein', kcal: 120, protein: 20.5, carbs: 0, fat: 4.0, fiber: 0, calcium: 40, iron: 1.0, vitA: 15, vitC: 0, folate: 10, potassium: 300 },
    { name: 'Fish - Salmon (cooked)', category: 'Dairy & Protein', kcal: 206, protein: 22.1, carbs: 0, fat: 12.4, fiber: 0, calcium: 15, iron: 0.3, vitA: 12, vitC: 0, folate: 29, potassium: 384 },
    { name: 'Tofu (firm)', category: 'Dairy & Protein', kcal: 144, protein: 15.8, carbs: 3.9, fat: 8.7, fiber: 2.3, calcium: 350, iron: 5.4, vitA: 0, vitC: 0.1, folate: 19, potassium: 237 },
    { name: 'Whey Protein (powder, typical)', category: 'Dairy & Protein', kcal: 400, protein: 80.0, carbs: 8.0, fat: 6.0, fiber: 0, calcium: 400, iron: 1.0, vitA: 0, vitC: 0, folate: 20, potassium: 500 },

    // ---- Nuts, seeds & fats (per 100 g) ----
    { name: 'Almonds', category: 'Nuts & Seeds', kcal: 579, protein: 21.2, carbs: 21.6, fat: 49.9, fiber: 12.5, calcium: 269, iron: 3.7, vitA: 0, vitC: 0, folate: 44, potassium: 733 },
    { name: 'Walnuts', category: 'Nuts & Seeds', kcal: 654, protein: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7, calcium: 98, iron: 2.9, vitA: 1, vitC: 1.3, folate: 98, potassium: 441 },
    { name: 'Cashews', category: 'Nuts & Seeds', kcal: 553, protein: 18.2, carbs: 30.2, fat: 43.9, fiber: 3.3, calcium: 37, iron: 6.7, vitA: 0, vitC: 0.5, folate: 25, potassium: 660 },
    { name: 'Pistachios', category: 'Nuts & Seeds', kcal: 560, protein: 20.2, carbs: 27.2, fat: 45.3, fiber: 10.6, calcium: 105, iron: 3.9, vitA: 21, vitC: 5.6, folate: 51, potassium: 1025 },
    { name: 'Chia Seeds', category: 'Nuts & Seeds', kcal: 486, protein: 16.5, carbs: 42.1, fat: 30.7, fiber: 34.4, calcium: 631, iron: 7.7, vitA: 0, vitC: 1.6, folate: 49, potassium: 407 },
    { name: 'Flax Seeds', category: 'Nuts & Seeds', kcal: 534, protein: 18.3, carbs: 28.9, fat: 42.2, fiber: 27.3, calcium: 255, iron: 5.7, vitA: 0, vitC: 0.6, folate: 87, potassium: 813 },
    { name: 'Pumpkin Seeds', category: 'Nuts & Seeds', kcal: 559, protein: 30.2, carbs: 10.7, fat: 49.1, fiber: 6.0, calcium: 46, iron: 8.8, vitA: 1, vitC: 1.9, folate: 58, potassium: 809 },
    { name: 'Ghee', category: 'Nuts & Seeds', kcal: 900, protein: 0, carbs: 0, fat: 100, fiber: 0, calcium: 4, iron: 0, vitA: 840, vitC: 0, folate: 0, potassium: 5 },
    { name: 'Mustard Oil', category: 'Nuts & Seeds', kcal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, calcium: 0, iron: 0, vitA: 0, vitC: 0, folate: 0, potassium: 0 },
    { name: 'Olive Oil', category: 'Nuts & Seeds', kcal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, calcium: 1, iron: 0.6, vitA: 0, vitC: 0, folate: 0, potassium: 1 }
  ];

  var NUTRIENTS = [
    { key: 'kcal', label: 'Calories', unit: 'kcal' },
    { key: 'protein', label: 'Protein', unit: 'g' },
    { key: 'carbs', label: 'Carbs', unit: 'g' },
    { key: 'fat', label: 'Fat', unit: 'g' },
    { key: 'fiber', label: 'Fiber', unit: 'g' },
    { key: 'calcium', label: 'Calcium', unit: 'mg' },
    { key: 'iron', label: 'Iron', unit: 'mg' },
    { key: 'vitA', label: 'Vitamin A', unit: 'mcg' },
    { key: 'vitC', label: 'Vitamin C', unit: 'mg' },
    { key: 'folate', label: 'Folate', unit: 'mcg' },
    { key: 'potassium', label: 'Potassium', unit: 'mg' }
  ];


  // Serving metadata for countable items (typical edible weights, reference)
  // Helps UI show piece-wise quantities (e.g. 2 eggs) while keeping per-100 g data intact.
  function enrichServings(list) {
    var byName = {
      'Egg (boiled, whole)': { grams: 50, unit: 'egg', step: 1, plural: 'eggs' },
      'Egg White (boiled)': { grams: 33, unit: 'egg white', step: 1, plural: 'egg whites' },
      'Roti / Chapati (whole wheat)': { grams: 40, unit: 'roti', step: 1, plural: 'rotis' },
      'Plain Paratha': { grams: 80, unit: 'paratha', step: 1, plural: 'parathas' },
      'Aloo Paratha': { grams: 120, unit: 'paratha', step: 1, plural: 'parathas' },
      'Idli (steamed)': { grams: 40, unit: 'idli', step: 1, plural: 'idlis' },
      'Plain Dosa': { grams: 80, unit: 'dosa', step: 1, plural: 'dosas' },
      'Masala Dosa': { grams: 180, unit: 'dosa', step: 1, plural: 'dosas' },
      'Uttapam': { grams: 120, unit: 'uttapam', step: 1, plural: 'uttapams' },
      'Besan Chilla': { grams: 60, unit: 'chilla', step: 1, plural: 'chillas' },
      'Banana': { grams: 100, unit: 'banana', step: 1, plural: 'bananas' },
      'Apple (with skin)': { grams: 150, unit: 'apple', step: 1, plural: 'apples' },
      'Orange': { grams: 130, unit: 'orange', step: 1, plural: 'oranges' },
      'Mosambi / Sweet Lime': { grams: 150, unit: 'mosambi', step: 1, plural: 'mosambis' },
      'Mango': { grams: 200, unit: 'mango', step: 1, plural: 'mangoes' },
      'Guava': { grams: 120, unit: 'guava', step: 1, plural: 'guavas' },
      'Pear': { grams: 170, unit: 'pear', step: 1, plural: 'pears' },
      'Peach': { grams: 150, unit: 'peach', step: 1, plural: 'peaches' },
      'Plum': { grams: 66, unit: 'plum', step: 1, plural: 'plums' },
      'Kiwi': { grams: 75, unit: 'kiwi', step: 1, plural: 'kiwis' },
      'Dates (dried)': { grams: 8, unit: 'date', step: 1, plural: 'dates' }
    };
    list.forEach(function (f) {
      var s = byName[f.name];
      if (s) f.serving = s;
    });
  }
  enrichServings(FOODS);

  function categories() {
    var seen = {};
    FOODS.forEach(function (f) { seen[f.category] = true; });
    return Object.keys(seen);
  }

  window.NutritionDB = {
    foods: FOODS,
    nutrients: NUTRIENTS,
    categories: categories
  };
})();
