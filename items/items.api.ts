// services/items/api.ts
import { api, APIError } from "encore.dev/api";
import { db } from "./db";

// Existing interfaces
interface Item {
  id: string;
  name: string;
  category_id: string;
  description: string;
  notes: string;
  average_value: number;
  average_carbon_offset: number;
  created_at: Date;
  updated_at: Date;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}

// New wrapper interfaces for array responses
interface ItemListResponse {
  items: ItemWithCategory[];
}

interface CategoryListResponse {
  categories: Category[];
}

// Keep existing composite interfaces
interface RawItemWithCategory extends Item {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_description: string;
  category_created_at: Date;
  category_updated_at: Date;
}

interface ItemWithCategory extends Item {
  category: Category;
}

interface CategoryWithItems extends Category {
  items: Item[];
}

// GET /items - List all items with categories
export const listItems = api(
  { method: "GET", path: "/items", expose: true },
  async (): Promise<ItemListResponse> => {
    const items: ItemWithCategory[] = [];
    
    for await (const row of db.query<RawItemWithCategory>`
      SELECT i.*, 
             c.id as category_id, 
             c.name as category_name, 
             c.icon as category_icon, 
             c.description as category_description,
             c.created_at as category_created_at, 
             c.updated_at as category_updated_at
      FROM items i
      JOIN item_categories c ON i.category_id = c.id
    `) {
      items.push({
        ...row,
        category: {
          id: row.category_id,
          name: row.category_name,
          icon: row.category_icon,
          description: row.category_description,
          created_at: row.category_created_at,
          updated_at: row.category_updated_at,
        }
      });
    }
    
    return { items };
  }
);

// GET /items/categories - List all categories (namespaced)
export const listCategories = api(
  { method: "GET", path: "/items/categories", expose: true },
  async (): Promise<CategoryListResponse> => {
    const categories: Category[] = [];
    for await (const category of db.query<Category>`
      SELECT * FROM item_categories
    `) {
      categories.push(category);
    }
    return { categories };
  }
);

// GET /items/categories/:id - Get category with items (namespaced)
export const getCategory = api(
  { method: "GET", path: "/items/categories/:id", expose: true },
  async (params: { id: string }): Promise<CategoryWithItems> => {
    const [category, itemsResult] = await Promise.all([
      db.queryRow<Category>`
        SELECT * FROM item_categories WHERE id = ${params.id}
      `,
      db.query<Item>`
        SELECT * FROM items WHERE category_id = ${params.id}
      `
    ]);
    
    if (!category) throw APIError.notFound("Category not found");
    
    const items: Item[] = [];
    for await (const item of itemsResult) {
      items.push(item);
    }
    
    return {
      ...category,
      items: items
    };
  }
);