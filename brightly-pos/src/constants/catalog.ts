import type { Category, Item } from "../types";

export const categoryFallback = "#e5e7eb";

export const categoryColors = [
  "#f8cfc1",
  "#d8e7ca",
  "#c9e5f6",
  "#f5ddaa",
  "#d9d4f4",
  "#f6c8d8",
];

const seededAt = new Date().toISOString();

export const seedCategories: Category[] = [
  {
    id: "cat_espresso",
    name: "Espresso",
    defaultColor: "#f8cfc1",
    createdAt: seededAt,
  },
  {
    id: "cat_milk",
    name: "Milk Coffee",
    defaultColor: "#d8e7ca",
    createdAt: seededAt,
  },
  {
    id: "cat_cold",
    name: "Cold Bar",
    defaultColor: "#c9e5f6",
    createdAt: seededAt,
  },
  {
    id: "cat_pastry",
    name: "Pastries",
    defaultColor: "#f5ddaa",
    createdAt: seededAt,
  },
];

export const seedItems: Item[] = [
  {
    id: "item_americano",
    name: "Americano",
    price: 12000,
    categoryId: "cat_espresso",
    createdAt: seededAt,
  },
  {
    id: "item_cappuccino",
    name: "Cappuccino",
    price: 15000,
    categoryId: "cat_milk",
    createdAt: seededAt,
  },
  {
    id: "item_latte",
    name: "Cafe Latte",
    price: 16000,
    categoryId: "cat_milk",
    createdAt: seededAt,
  },
  {
    id: "item_mocha",
    name: "Iced Mocha",
    price: 18000,
    categoryId: "cat_cold",
    createdAt: seededAt,
  },
  {
    id: "item_cold_brew",
    name: "Cold Brew",
    price: 17000,
    categoryId: "cat_cold",
    createdAt: seededAt,
  },
  {
    id: "item_croissant",
    name: "Butter Croissant",
    price: 9500,
    categoryId: "cat_pastry",
    createdAt: seededAt,
  },
  {
    id: "item_cookie",
    name: "Chocolate Cookie",
    price: 8500,
    categoryId: "cat_pastry",
    createdAt: seededAt,
  },
];
