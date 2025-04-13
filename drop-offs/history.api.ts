// drop-offs/history.api.ts
import { api, APIError } from "encore.dev/api/mod.js";
import { db } from "./db";
import { DropOff, DropOffItem } from "./drop-offs.api";

// GET /api/dropoffs/recent
export const getRecentDropOffs = api(
  { method: "GET", path: "/api/dropoffs/recent", auth: true },
  async (params: { auth: { userId: string }; limit?: number }) => {
    const limit = params.limit || 5;
    const dropOffs: (DropOff & { items: DropOffItem[] })[] = [];
    
    // Get recent drop-offs
    for await (const dropOff of db.query<DropOff>`
      SELECT d.* 
      FROM drop_offs d
      WHERE d.user_id = ${params.auth.userId}
      ORDER BY d.drop_off_date DESC
      LIMIT ${limit}
    `) {
      // Get items for each drop-off
      const items: DropOffItem[] = [];
      for await (const item of db.query<DropOffItem>`
        SELECT * FROM drop_off_items 
        WHERE drop_off_id = ${dropOff.id}
      `) {
        items.push(item);
      }
      
      dropOffs.push({
        ...dropOff,
        items
      });
    }

    return { dropOffs };
  }
);

// GET /api/dropoffs/export
export const exportDropOffs = api(
  { method: "GET", path: "/api/dropoffs/export", auth: true },
  async (params: { 
    auth: { userId: string }; 
    format: 'csv' | 'json';
    startDate?: string;
    endDate?: string;
  }) => {    const dropOffs: any[] = [];
    for await (const row of db.query<{
      drop_off_id: string;
      drop_off_date: Date;
      facility_name: string;
      item_name: string;
      quantity: number;
      condition?: string;
      estimated_value?: number;
      carbon_offset?: number;
      trees_equivalent?: number;
      landfill_reduction?: number;
    }>`
      SELECT 
        d.id as drop_off_id,
        d.drop_off_date,
        f.name as facility_name,
        i.name as item_name,
        di.quantity,
        di.condition,
        di.estimated_value,
        im.carbon_offset,
        im.trees_equivalent,
        im.landfill_reduction
      FROM drop_offs d
      JOIN facilities f ON d.facility_id = f.id
      JOIN drop_off_items di ON d.id = di.drop_off_id
      JOIN items i ON di.item_id = i.id
      LEFT JOIN impact_metrics im ON d.id = im.drop_off_id
      WHERE d.user_id = ${params.auth.userId}      ${params.startDate ? `AND d.drop_off_date >= ${params.startDate}` : ''}
      ${params.endDate ? `AND d.drop_off_date <= ${params.endDate}` : ''}
      ORDER BY d.drop_off_date DESC
    `) {
      dropOffs.push(row);
    }

    // TODO: Convert to requested format and generate download URL
    // For now, return JSON response
    return { data: dropOffs };
  }
);
