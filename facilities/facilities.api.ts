// facilities/facilities.api.ts
import { api, Query, APIError } from "encore.dev/api";
import { mainDB } from "../shared/db";

export interface Facility {
    id: string;
    name: string;
    type: "donation" | "recycling" | "disposal";
    description: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    phone: string;
    website: string;
    email: string;
    latitude: number;
    longitude: number;
    notes: string;
    tax_deductible: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface FacilityHour {
    id: string;
    facility_id: string;
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
}

export interface FacilityItem {
    facility_id: string;
    item_id: string;
    is_accepted: boolean;
    notes: string;
}

export interface FacilityReview {
    id: string;
    facility_id: string;
    user_id: string;
    rating: number;
    review_text: string;
    created_at: Date;
}

export interface FacilityWithDetails extends Facility {
    hours: FacilityHour[];
    accepted_items: FacilityItem[];
    rejected_items: FacilityItem[];
    reviews: FacilityReview[];
}

export interface BestMatchResponse {
    facility: Facility;
    match_percentage: string;
}

// GET /api/facilities
export const listFacilities = api(
    { 
      method: "GET", 
      path: "/api/facilities",
      expose: true 
    },
    async (params: { 
      zipCode?: Query<string>,
      itemIds?: Query<string[]>
    }): Promise<{ facilities: Facility[] }> => {
      let query = `
        SELECT f.* 
        FROM facilities f
      `;
      
      const conditions = [];
      if (params.itemIds) {
        conditions.push(`f.id IN (
          SELECT facility_id 
          FROM facility_items 
          WHERE item_id = ANY(${params.itemIds})
        )`);
      }
      if (params.zipCode) {
        conditions.push(`f.zip_code = ${params.zipCode}`);
      }
      
      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }
  
      const facilities: Facility[] = [];
      for await (const row of mainDB.query<Facility>`${query}`) {
        facilities.push(row);
      }
      
      return { facilities };
    }
  );
  
  // GET /api/facilities/:id
  export const getFacility = api(
    { 
      method: "GET", 
      path: "/api/facilities/:id",
      expose: true 
    },
    async (params: { id: string }): Promise<FacilityWithDetails> => {
      const facility = await mainDB.queryRow<Facility>`
        SELECT * FROM facilities WHERE id = ${params.id}
      `;
      
      if (!facility) throw APIError.notFound("Facility not found");
  
      const [hours, items, reviews] = await Promise.all([
        mainDB.query<FacilityHour>`
          SELECT * FROM facility_hours WHERE facility_id = ${params.id}
        `,
        mainDB.query<FacilityItem>`
          SELECT * FROM facility_items WHERE facility_id = ${params.id}
        `,
        mainDB.query<FacilityReview>`
          SELECT * FROM facility_reviews WHERE facility_id = ${params.id}
        `
      ]);
  
      // Collect results from async generators
      const hoursList: FacilityHour[] = [];
      for await (const hour of hours) hoursList.push(hour);
      
      const itemsList: FacilityItem[] = [];
      for await (const item of items) itemsList.push(item);
      
      const reviewsList: FacilityReview[] = [];
      for await (const review of reviews) reviewsList.push(review);
  
      return {
        ...facility,
        hours: hoursList,
        accepted_items: itemsList.filter(i => i.is_accepted),
        rejected_items: itemsList.filter(i => !i.is_accepted),
        reviews: reviewsList
      };
    }
  );
  
  // GET /api/facilities/best-match
  export const findBestMatch = api(
    { 
      method: "GET", 
      path: "/api/facilities/best-match",
      expose: true 
    },
    async (params: { 
      itemIds: Query<string[]>,
      zipCode?: Query<string>
    }): Promise<BestMatchResponse> => {
      let query = `
        WITH matches AS (
          SELECT f.*, COUNT(fi.item_id) AS match_count
          FROM facilities f
          JOIN facility_items fi ON f.id = fi.facility_id
          WHERE fi.item_id = ANY(${params.itemIds})
      `;
      
      if (params.zipCode) {
        query += ` AND f.zip_code = ${params.zipCode}`;
      }
      
      query += `
          GROUP BY f.id
          ORDER BY match_count DESC
          LIMIT 1
        )
        SELECT *, match_count FROM matches
      `;
  
      const rows: (Facility & { match_count: number })[] = [];
      for await (const row of mainDB.query<Facility & { match_count: number }>`${query}`) {
        rows.push(row);
      }
  
      if (rows.length === 0) throw APIError.notFound("No matching facilities");
  
      const best = rows[0];
      const matchPercentage = (best.match_count / params.itemIds.length * 100).toFixed(2);
  
      return {
        facility: best,
        match_percentage: matchPercentage
      };
    }
  );
  
  // GET /api/facilities/search
  export const searchFacilities = api(
    { 
      method: "GET", 
      path: "/api/facilities/search",
      expose: true 
    },
    async (params: { 
      q: Query<string>, 
      type?: Query<string>,
      tax_deductible?: Query<boolean>,
      zipCode?: Query<string>
    }): Promise<{ facilities: Facility[] }> => {
      const search = `%${params.q}%`;
      
      let query = `
        SELECT * FROM facilities
        WHERE 
          (name ILIKE ${search} OR address ILIKE ${search})
      `;
      
      if (params.zipCode) {
        query += ` AND zip_code = ${params.zipCode}`;
      }
      if (params.type) {
        query += ` AND type = ${params.type}`;
      }
      if (params.tax_deductible !== undefined) {
        query += ` AND tax_deductible = ${params.tax_deductible}`;
      }
  
      const facilities: Facility[] = [];
      for await (const row of mainDB.query<Facility>`${query}`) {
        facilities.push(row);
      }
  
      return { facilities };
    }
  );