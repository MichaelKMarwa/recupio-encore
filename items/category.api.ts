// items/category.api.ts
import { api, APIError } from "encore.dev/api/mod.js";
import { db } from "./db";
import type { Item, Category } from "./types.js";

// GET /categories/:id/items - Get all items in a specific category
export const getCategoryItems = api(
  { method: "GET", path: "/categories/:id/items", expose: true },
  async (params: { id: string }) => {
    const category = await db.queryRow<Category>`
      SELECT * FROM categories WHERE id = ${params.id}
    `;
    
    if (!category) {
      throw APIError.notFound("Category not found");
    }

    const items: Item[] = [];
    for await (const item of db.query<Item>`
      SELECT * FROM items WHERE category_id = ${params.id}
      ORDER BY name ASC
    `) {
      items.push(item);
    }

    return {
      category,
      items
    };
  }
);

// GET /categories/:id/stats - Get category statistics
export const getCategoryStats = api(
  { method: "GET", path: "/categories/:id/stats", expose: true },
  async (params: { id: string }) => {
    const stats = await db.queryRow<{
      total_items: number;
      total_drop_offs: number;
      total_impact: number;
    }>`
      SELECT 
        COUNT(DISTINCT i.id) as total_items,
        COUNT(DISTINCT di.drop_off_id) as total_drop_offs,
        COALESCE(SUM(im.carbon_offset), 0) as total_impact
      FROM categories c
      LEFT JOIN items i ON i.category_id = c.id
      LEFT JOIN drop_off_items di ON di.item_id = i.id
      LEFT JOIN impact_metrics im ON im.drop_off_id = di.drop_off_id
      WHERE c.id = ${params.id}
    `;

    if (!stats) {
      throw APIError.notFound("Category not found");
    }

    return stats;
  }
);

// GET /categories/popular - Get most popular categories
export const getPopularCategories = api(
  { method: "GET", path: "/categories/popular", expose: true },
  async (params: { limit?: number }) => {
    const limit = params.limit || 5;    const categories: (Category & { drop_off_count: number })[] = [];
    for await (const category of db.query<Category & { drop_off_count: number }>`
      SELECT 
        c.*,
        COUNT(DISTINCT di.drop_off_id) as drop_off_count
      FROM categories c
      LEFT JOIN items i ON i.category_id = c.id
      LEFT JOIN drop_off_items di ON di.item_id = i.id
      GROUP BY c.id
      ORDER BY drop_off_count DESC
      LIMIT ${limit}
    `) {
      categories.push(category);
    }

    return { categories };
  }
);
