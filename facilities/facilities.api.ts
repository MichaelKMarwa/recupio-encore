// facilities/facilities.api.ts
import { api, APIError, Query } from "encore.dev/api";
import { db } from "../shared/db";

// Define the facility interface that matches our database schema
export interface Facility {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  website?: string;
  email?: string;
  imageUrl?: string;
  isVerified: boolean;
  // These fields come from related tables
  types?: string[];
  distance?: number; // calculated field for location-based queries
  hours?: FacilityHour[];
  acceptedItems?: string[];
  rejectedItems?: string[];
}

// Additional interfaces for facility details
export interface FacilityHour {
  id: string;
  facility_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface FacilityReview {
  id: string;
  facility_id: string;
  user_id: string;
  rating: number;
  review_text: string;
  created_at: Date;
}

export interface FacilityPhoto {
  id: string;
  facility_id: string;
  photo_url: string;
  created_at: Date;
}

export interface FacilityItem {
  id: string;
  facility_id: string;
  item_id: string;
}

// FacilityWithDetails extends Facility with full related data
export interface FacilityWithDetails extends Facility {
  hours: FacilityHour[];
  reviews?: FacilityReview[];
  items: FacilityItem[];
}

export interface BestMatchResponse {
    facility: Facility;
    match_percentage: string;
}

// Interface for query parameters
interface GetFacilitiesParams {
  type?: Query<string>;
  city?: Query<string>;
  zipCode?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
  lat?: Query<number>;
  lng?: Query<number>;
  radius?: Query<number>; // in miles
}

// Interface for response
interface GetFacilitiesResponse {
  facilities: Facility[];
  total: number;
}

// GET /facilities - List all facilities with optional filtering
export const getFacilities = api(
  { 
    method: "GET", 
    path: "/facilities", 
    expose: true 
  },
  async (params: GetFacilitiesParams): Promise<GetFacilitiesResponse> => {
    // Default values
    const limit = params.limit || 20;
    const offset = params.offset || 0;
    
    try {
      // Build dynamic conditions
      const conditions = [];
      const whereParams: any[] = [];
      let whereClause = '';
      
      if (params.city) {
        conditions.push(`city = $${whereParams.length + 1}`);
        whereParams.push(params.city);
      }
      
      if (params.zipCode) {
        conditions.push(`zip_code = $${whereParams.length + 1}`);
        whereParams.push(params.zipCode);
      }
      
      // Type filtering requires a join to facility_type_mappings and facility_types
      let typeJoin = '';
      if (params.type) {
        typeJoin = `
          JOIN facility_type_mappings ftm ON f.id = ftm.facility_id
          JOIN facility_types ft ON ftm.type_id = ft.id AND ft.name = $${whereParams.length + 1}
        `;
        whereParams.push(params.type);
      }
      
      // Location-based search
      if (params.lat && params.lng && params.radius) {
        const lat = Number(params.lat);
        const lng = Number(params.lng);
        const radiusMeters = Number(params.radius) * 1609.34; // Convert miles to meters
        
        conditions.push(`ST_DWithin(location, ST_SetSRID(ST_MakePoint($${whereParams.length + 1}, $${whereParams.length + 2}), 4326), $${whereParams.length + 3})`);
        whereParams.push(lng, lat, radiusMeters);
      }
      
      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
      
      // Get total count
      let total = 0;
      const countQuery = `
        SELECT COUNT(DISTINCT f.id) AS total 
        FROM facilities f
        ${typeJoin}
        ${whereClause}
      `;
      
      for await (const row of db.query`
        SELECT COUNT(DISTINCT f.id) AS total 
        FROM facilities f
        ${typeJoin}
        ${whereClause}
      `) {
        total = parseInt(row.total?.toString() || '0', 10);
        break;
      }
      
      // Fetch facilities with pagination
      const facilitiesQuery = `
        SELECT 
          f.id, f.name, f.description, f.address, f.city, f.state, 
          f.zip_code, f.phone, f.website, f.email, f.image_url, f.is_verified
        FROM facilities f
        ${typeJoin}
        ${whereClause}
        GROUP BY f.id
        ORDER BY f.name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      const facilities: Facility[] = [];
      for await (const row of db.query`
        SELECT 
          f.id, f.name, f.description, f.address, f.city, f.state, 
          f.zip_code, f.phone, f.website, f.email, f.image_url, f.is_verified
        FROM facilities f
        ${typeJoin}
        ${whereClause}
        GROUP BY f.id
        ORDER BY f.name ASC
        LIMIT ${limit} OFFSET ${offset}
      `) {
        facilities.push(await enrichFacilityData(row));
      }
      
      return { facilities, total };
    } catch (error) {
      console.error("Error retrieving facilities:", error);
      throw error;
    }
  }
);

// GET /facilities/:id - Get a single facility by ID
export const getFacilityById = api(
  { 
    method: "GET", 
    path: "/facilities/:id", 
    expose: true 
  },
  async (params: { id: string }): Promise<FacilityWithDetails> => {
    try {
      let facility: any = null;
      for await (const row of db.query`
        SELECT 
          id, name, description, address, city, state, 
          zip_code, phone, website, email, image_url, is_verified
        FROM facilities
        WHERE id = ${params.id}
      `) {
        facility = row;
        break;
      }
      
      if (!facility) {
        throw APIError.notFound(`Facility with ID ${params.id} not found`);
      }
      
      // Get facility types
      const types: string[] = [];
      for await (const row of db.query`
        SELECT ft.name
        FROM facility_type_mappings ftm
        JOIN facility_types ft ON ftm.type_id = ft.id
        WHERE ftm.facility_id = ${params.id}
      `) {
        types.push(row.name);
      }
      
      // Get facility hours
      const hours: FacilityHour[] = [];
      for await (const row of db.query`
        SELECT id, facility_id, day_of_week, open_time, close_time, is_closed
        FROM facility_hours
        WHERE facility_id = ${params.id}
        ORDER BY day_of_week
      `) {
        hours.push(row as FacilityHour);
      }
      
      // Get facility items
      const items: FacilityItem[] = [];
      for await (const row of db.query`
        SELECT fi.id, fi.facility_id, fi.item_id
        FROM facility_items fi
        WHERE fi.facility_id = ${params.id}
      `) {
        items.push(row as FacilityItem);
      }
      
      // Get facility reviews
      const reviews: FacilityReview[] = [];
      // If we have a reviews table, we'd query it here
      /*
      for await (const row of db.query(`
        SELECT id, facility_id, user_id, rating, review_text, created_at
        FROM facility_reviews
        WHERE facility_id = $1
        ORDER BY created_at DESC
      `, params.id)) {
        reviews.push(row as FacilityReview);
      }
      */
      
      return {
        id: facility.id,
        name: facility.name,
        description: facility.description,
        address: facility.address,
        city: facility.city,
        state: facility.state,
        zipCode: facility.zip_code,
        phone: facility.phone,
        website: facility.website,
        email: facility.email,
        imageUrl: facility.image_url,
        isVerified: facility.is_verified,
        types,
        hours,
        items,
        reviews
      };
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error retrieving facility:", error);
      throw APIError.internal(`Error retrieving facility: ${error.message}`);
    }
  }
);

// Helper function to enrich facility data with related information
async function enrichFacilityData(row: any): Promise<Facility> {
  const facility: Facility = {
    id: row.id,
    name: row.name,
    description: row.description,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    phone: row.phone,
    website: row.website,
    email: row.email,
    imageUrl: row.image_url,
    isVerified: !!row.is_verified,
  };
  
  // Get facility types
  const types: string[] = [];
  for await (const typeRow of db.query`
    SELECT ft.name
    FROM facility_type_mappings ftm
    JOIN facility_types ft ON ftm.type_id = ft.id
    WHERE ftm.facility_id = ${row.id}
  `) {
    types.push(typeRow.name);
  }
  facility.types = types;
  
  // Get accepted items (we don't store items as accepted_items column, but get them from facility_items)
  const acceptedItems: string[] = [];
  for await (const itemRow of db.query`
    SELECT i.name
    FROM facility_items fi
    JOIN items i ON fi.item_id = i.id
    WHERE fi.facility_id = ${row.id}
  `) {
    acceptedItems.push(itemRow.name);
  }
  facility.acceptedItems = acceptedItems;
  
  // We don't have rejected items in our schema, but we'll initialize as empty array
  facility.rejectedItems = [];
  
  // Get hours - we'll do this conditionally based on a function parameter in a production app
  // For now, we'll keep it simple and not fetch hours by default
  // Hours can be retrieved specifically in getFacilityById
  
  return facility;
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
    const facilities: Facility[] = [];
    
    // Build query conditions
    if (params.itemIds && params.itemIds.length > 0) {
      for await (const row of db.query`
        SELECT DISTINCT f.* 
        FROM facilities f
        JOIN facility_items fi ON f.id = fi.facility_id
        WHERE fi.item_id = ANY(${params.itemIds}::uuid[])
        ORDER BY f.name
      `) {
        facilities.push(await enrichFacilityData(row));
      }
    } else if (params.zipCode) {
      for await (const row of db.query`
        SELECT f.* 
        FROM facilities f
        WHERE f.zip_code = ${params.zipCode}
        ORDER BY f.name
      `) {
        facilities.push(await enrichFacilityData(row));
      }
    } else {
      // No filters
      for await (const row of db.query`
        SELECT f.* 
        FROM facilities f
        ORDER BY f.name
      `) {
        facilities.push(await enrichFacilityData(row));
      }
    }
    
    return { facilities };
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
    let queryStr = `
      WITH matches AS (
        SELECT f.*, COUNT(fi.item_id) AS match_count
        FROM facilities f
        JOIN facility_items fi ON f.id = fi.facility_id
        WHERE fi.item_id = ANY($1::uuid[])
    `;
    
    const queryParams = [params.itemIds];
    
    if (params.zipCode) {
      queryStr += ` AND f.zip_code = $2`;
      queryParams.push(params.zipCode);
    }
    
    queryStr += `
        GROUP BY f.id
        ORDER BY match_count DESC
        LIMIT 1
      )
      SELECT *, match_count FROM matches
    `;
    
    const rows: any[] = [];
    if (params.zipCode) {
      for await (const row of db.query`
        WITH matches AS (
          SELECT f.*, COUNT(fi.item_id) AS match_count
          FROM facilities f
          JOIN facility_items fi ON f.id = fi.facility_id
          WHERE fi.item_id = ANY(${params.itemIds}::uuid[])
          AND f.zip_code = ${params.zipCode}
          GROUP BY f.id
          ORDER BY match_count DESC
          LIMIT 1
        )
        SELECT *, match_count FROM matches
      `) {
        rows.push(row);
      }
    } else {
      for await (const row of db.query`
        WITH matches AS (
          SELECT f.*, COUNT(fi.item_id) AS match_count
          FROM facilities f
          JOIN facility_items fi ON f.id = fi.facility_id
          WHERE fi.item_id = ANY(${params.itemIds}::uuid[])
          GROUP BY f.id
          ORDER BY match_count DESC
          LIMIT 1
        )
        SELECT *, match_count FROM matches
      `) {
        rows.push(row);
      }
    }
    
    if (rows.length === 0) throw APIError.notFound("No matching facilities");
    
    const best = rows[0];
    const facility = await enrichFacilityData(best);
    const matchPercentage = (best.match_count / params.itemIds.length * 100).toFixed(2);
    
    return {
      facility,
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
    zipCode?: Query<string>
  }): Promise<{ facilities: Facility[] }> => {
    const searchPattern = `%${params.q}%`;
    let queryStr = `
      SELECT DISTINCT f.* 
      FROM facilities f
    `;
    
    const queryParams: any[] = [];
    const conditions: string[] = [];
    
    // Add type filter if needed
    if (params.type) {
      queryStr += `
        JOIN facility_type_mappings ftm ON f.id = ftm.facility_id
        JOIN facility_types ft ON ftm.type_id = ft.id
      `;
      conditions.push(`ft.name = $${queryParams.length + 1}`);
      queryParams.push(params.type);
    }
    
    // Add search condition
    conditions.push(`(f.name ILIKE $${queryParams.length + 1} OR f.address ILIKE $${queryParams.length + 1})`);
    queryParams.push(searchPattern);
    
    // Add zip code filter if needed
    if (params.zipCode) {
      conditions.push(`f.zip_code = $${queryParams.length + 1}`);
      queryParams.push(params.zipCode);
    }
    
    queryStr += ` WHERE ${conditions.join(' AND ')} ORDER BY f.name`;
    
    const facilities: Facility[] = [];
    if (params.type && params.zipCode) {
      for await (const row of db.query`
        SELECT DISTINCT f.* 
        FROM facilities f
        JOIN facility_type_mappings ftm ON f.id = ftm.facility_id
        JOIN facility_types ft ON ftm.type_id = ft.id
        WHERE ft.name = ${params.type}
        AND (f.name ILIKE ${searchPattern} OR f.address ILIKE ${searchPattern})
        AND f.zip_code = ${params.zipCode}
        ORDER BY f.name
      `) {
        facilities.push(await enrichFacilityData(row));
      }
    } else if (params.type) {
      for await (const row of db.query`
        SELECT DISTINCT f.* 
        FROM facilities f
        JOIN facility_type_mappings ftm ON f.id = ftm.facility_id
        JOIN facility_types ft ON ftm.type_id = ft.id
        WHERE ft.name = ${params.type}
        AND (f.name ILIKE ${searchPattern} OR f.address ILIKE ${searchPattern})
        ORDER BY f.name
      `) {
        facilities.push(await enrichFacilityData(row));
      }
    } else if (params.zipCode) {
      for await (const row of db.query`
        SELECT DISTINCT f.* 
        FROM facilities f
        WHERE (f.name ILIKE ${searchPattern} OR f.address ILIKE ${searchPattern})
        AND f.zip_code = ${params.zipCode}
        ORDER BY f.name
      `) {
        facilities.push(await enrichFacilityData(row));
      }
    } else {
      for await (const row of db.query`
        SELECT DISTINCT f.* 
        FROM facilities f
        WHERE (f.name ILIKE ${searchPattern} OR f.address ILIKE ${searchPattern})
        ORDER BY f.name
      `) {
        facilities.push(await enrichFacilityData(row));
      }
    }
    
    return { facilities };
  }
);