import * as fs from 'fs';
import * as path from 'path';
import { db } from '../shared/db';

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

// Run this function to import facilities directly
async function importFacilities() {
  try {
    // Path to the JSON file
    const dataPath = path.resolve(process.cwd(), 'data', 'facilities.json');
    
    if (!fs.existsSync(dataPath)) {
      console.error(`File not found: ${dataPath}`);
      process.exit(1);
    }
    
    // Read the JSON file
    const jsonData = fs.readFileSync(dataPath, 'utf-8');
    const facilities: JSONFacility[] = JSON.parse(jsonData);
    
    console.log(`Found ${facilities.length} facilities to import`);
    
    // Begin transaction
    await db.exec`BEGIN`;
    
    // Counter for imported facilities
    let count = 0;
    
    for (const facility of facilities) {
      // Map JSON data to our facility structure
      const mappedFacility = {
        name: facility.title || "",
        type: determineFacilityType(facility),
        address: facility.address || "",
        city: facility.city || "",
        state: facility.state || "",
        zipCode: facility.postalCode || "",
        phone: facility.phoneUnformatted || facility.phone || "",
        website: facility.website,
        hours: facility.hours || "",
        acceptedItems: [],
        rejectedItems: [],
        notes: "",
        distance: typeof facility.distance === 'number' ? facility.distance : null,
        rating: facility.totalScore || 0,
        imageUrl: facility.imageUrl,
        latitude: facility.location?.lat || 0,
        longitude: facility.location?.lng || 0,
        tags: facility.categoryName ? [facility.categoryName] : [],
        description: facility.description || facility.categoryName || "",
        taxDeductible: facility.categoryName?.toLowerCase().includes('donation') || false,
        pickupAvailable: facility.description?.toLowerCase().includes('pickup') || false,
      };
      
      // Create point for PostGIS
      const point = mappedFacility.latitude && mappedFacility.longitude 
        ? `POINT(${mappedFacility.longitude} ${mappedFacility.latitude})` 
        : null;
      
      // Insert facility into database
      const query = `
        INSERT INTO facilities (
          name, type, address, city, state, zip_code, phone, website,
          hours, accepted_items, rejected_items, notes, distance, rating,
          image_url, latitude, longitude, location, tags, description,
          tax_deductible, pickup_available, extra_data, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14,
          $15, $16, $17, ${point ? `ST_GeographyFromText('SRID=4326;${point}')` : 'NULL'}, $18, $19,
          $20, $21, $22, NOW(), NOW()
        )
      `;
      
      // Insert into DB
      await db.exec(
        query,
        mappedFacility.name,
        mappedFacility.type,
        mappedFacility.address,
        mappedFacility.city,
        mappedFacility.state,
        mappedFacility.zipCode,
        mappedFacility.phone,
        mappedFacility.website,
        mappedFacility.hours,
        mappedFacility.acceptedItems,
        mappedFacility.rejectedItems,
        mappedFacility.notes,
        mappedFacility.distance,
        mappedFacility.rating,
        mappedFacility.imageUrl,
        mappedFacility.latitude,
        mappedFacility.longitude,
        mappedFacility.tags,
        mappedFacility.description,
        mappedFacility.taxDeductible,
        mappedFacility.pickupAvailable,
        JSON.stringify(facility)
      );
      
      count++;
      
      if (count % 100 === 0) {
        console.log(`Imported ${count} facilities...`);
      }
    }
    
    // Commit transaction
    await db.exec`COMMIT`;
    
    console.log(`Successfully imported ${count} facilities`);
    
  } catch (error) {
    // Rollback on error
    await db.exec`ROLLBACK`;
    console.error("Error importing facilities:", error);
    process.exit(1);
  }
}

// Helper function to determine facility type based on JSON data
function determineFacilityType(json: JSONFacility): 'donation' | 'recycling' | 'trash' | 'mixed' {
  const category = json.categoryName?.toLowerCase() || '';
  
  if (category.includes('recycling')) return 'recycling';
  if (category.includes('donation') || category.includes('charity') || category.includes('thrift')) return 'donation';
  if (category.includes('waste') || category.includes('trash') || category.includes('disposal')) return 'trash';
  
  return 'mixed';
}

// Run the import if this file is executed directly
if (require.main === module) {
  importFacilities().catch(console.error);
} 