import { api } from "encore.dev/api";
import { db } from "../shared/db";
import * as fs from "fs";
import * as path from "path";

// Define the facility interface that matches our database schema
export interface Facility {
  id: string;
  name: string;
  type: 'donation' | 'recycling' | 'trash' | 'mixed';
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  website?: string;
  hours: string;
  acceptedItems: string[];
  rejectedItems?: string[];
  notes?: string;
  distance?: number; // in miles
  rating: number; // out of 5
  imageUrl?: string;
  latitude: number;
  longitude: number;
  tags: string[];
  description: string;
  taxDeductible: boolean;
  pickupAvailable: boolean;
}

// JSON facility structure from the imported data
interface JSONFacility {
  rank?: number;
  title: string;
  price?: any;
  categoryName?: string;
  address: string;
  neighborhood?: string;
  street?: string;
  city: string;
  postalCode?: string;
  state?: string;
  countryCode?: string;
  phone?: string;
  phoneUnformatted?: string;
  claimThisBusiness?: boolean;
  location?: {
    lat: number;
    lng: number;
  };
  totalScore?: number;
  permanentlyClosed?: boolean;
  website?: string;
  [key: string]: any; // Allow additional properties
}

// API endpoint to import facilities from JSON file
export const importFacilities = api(
  { 
    method: "POST",
    path: "/admin/facilities/import",
  },
  async (): Promise<{ count: number }> => {
    try {
      // Read the JSON file
      const dataPath = path.resolve(process.cwd(), "data", "facilities.json");
      const jsonData = fs.readFileSync(dataPath, 'utf-8');
      const facilities: JSONFacility[] = JSON.parse(jsonData);
      
      // Counter for imported facilities
      let count = 0;
      
      // Begin transaction using exec with BEGIN
      await db.exec`BEGIN`;
      
      // Process a limited number of facilities
      for (const facility of facilities.slice(0, 50)) {
        // Map JSON data to our facility structure
        const mappedFacility = mapJSONToFacility(facility);
        
        // Insert facility into database using tagged template literals
        await db.exec`
          INSERT INTO facilities (
            name, type, address, city, state, zip_code, phone, website,
            hours, accepted_items, rejected_items, notes, distance, rating,
            image_url, latitude, longitude, tags, description,
            tax_deductible, pickup_available, created_at, updated_at
          ) VALUES (
            ${mappedFacility.name || "Unknown Facility"}, 
            ${mappedFacility.type || 'mixed'}, 
            ${mappedFacility.address || "Unknown Address"}, 
            ${mappedFacility.city || "Unknown City"}, 
            ${mappedFacility.state || "Unknown"}, 
            ${mappedFacility.zipCode || ""}, 
            ${mappedFacility.phone || null}, 
            ${mappedFacility.website || null},
            ${mappedFacility.hours || null}, 
            ${mappedFacility.acceptedItems || []}, 
            ${mappedFacility.rejectedItems || []}, 
            ${mappedFacility.notes || null}, 
            ${mappedFacility.distance || null}, 
            ${mappedFacility.rating || 0}, 
            ${mappedFacility.imageUrl || null}, 
            ${mappedFacility.latitude || null}, 
            ${mappedFacility.longitude || null}, 
            ${mappedFacility.tags || []}, 
            ${mappedFacility.description || null},
            ${mappedFacility.taxDeductible || false}, 
            ${mappedFacility.pickupAvailable || false}, 
            NOW(), 
            NOW()
          )
          ON CONFLICT DO NOTHING
        `;
        
        count++;
      }
      
      // Commit transaction
      await db.exec`COMMIT`;
      
      return { count };
    } catch (error) {
      // Rollback on error
      await db.exec`ROLLBACK`;
      console.error("Error importing facilities:", error);
      throw error;
    }
  }
);

// Helper function to map JSON to Facility structure
function mapJSONToFacility(json: JSONFacility): Partial<Facility> {
  // Extract the basic facility information
  return {
    name: json.title || "",
    type: determineFacilityType(json),
    address: json.address || "",
    city: json.city || "",
    state: json.state || "",
    zipCode: json.postalCode || "",
    phone: json.phoneUnformatted || json.phone || "",
    website: json.website || undefined,
    hours: json.hours || "",
    acceptedItems: [], // Default empty array, would need specific extraction logic
    rejectedItems: [], // Default empty array, would need specific extraction logic
    notes: "",
    distance: typeof json.distance === 'number' ? json.distance : undefined,
    rating: json.totalScore || 0,
    imageUrl: json.imageUrl || undefined,
    latitude: json.location?.lat || 0,
    longitude: json.location?.lng || 0,
    tags: determineTags(json),
    description: json.description || json.categoryName || "",
    taxDeductible: determineTaxDeductible(json),
    pickupAvailable: determinePickupAvailable(json)
  };
}

// Helper function to determine facility type based on JSON data
function determineFacilityType(json: JSONFacility): 'donation' | 'recycling' | 'trash' | 'mixed' {
  const category = json.categoryName?.toLowerCase() || '';
  
  if (category.includes('recycling')) return 'recycling';
  if (category.includes('donation') || category.includes('charity') || category.includes('thrift')) return 'donation';
  if (category.includes('waste') || category.includes('trash') || category.includes('disposal')) return 'trash';
  
  return 'mixed';
}

// Helper function to determine tax deductible status
function determineTaxDeductible(json: JSONFacility): boolean {
  const category = json.categoryName?.toLowerCase() || '';
  return category.includes('charity') || category.includes('donation') || !!json.taxDeductible;
}

// Helper function to determine pickup available status
function determinePickupAvailable(json: JSONFacility): boolean {
  return !!json.pickupAvailable || json.description?.toLowerCase().includes('pickup') || false;
}

// Helper function to extract tags from JSON data
function determineTags(json: JSONFacility): string[] {
  const tags: string[] = [];
  
  if (json.categoryName) tags.push(json.categoryName);
  
  return tags;
} 