import { db } from '../shared/db';
import * as fs from 'fs';
import * as path from 'path';

// Types matching the database schema
interface Facility {
  name: string;
  type: 'donation' | 'recycling' | 'trash' | 'mixed';
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  website?: string;
  hours?: string;
  acceptedItems?: string[];
  rejectedItems?: string[];
  notes?: string;
  distance?: number;
  rating: number;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  tags: string[];
  description?: string;
  taxDeductible: boolean;
  pickupAvailable: boolean;
}

// Sample facility data if we can't load from file
const sampleFacilities: Facility[] = [
  {
    name: "Goodwill Donation Center",
    type: "donation",
    address: "123 Main St",
    city: "Seattle",
    state: "WA",
    zipCode: "98101",
    phone: "206-555-1234",
    website: "https://goodwill.org",
    hours: "Mon-Sat: 9am-5pm, Sun: 10am-4pm",
    acceptedItems: ["clothing", "furniture", "electronics", "household items"],
    rating: 4.5,
    tags: ["charity", "donation", "secondhand"],
    description: "Goodwill accepts donations of gently used goods to support their job training programs.",
    taxDeductible: true,
    pickupAvailable: true
  },
  {
    name: "Green Earth Recycling",
    type: "recycling",
    address: "456 Pine Ave",
    city: "Seattle",
    state: "WA",
    zipCode: "98102",
    phone: "206-555-5678",
    website: "https://greenearthrecycling.com",
    hours: "Mon-Fri: 8am-6pm, Sat: 9am-3pm",
    acceptedItems: ["plastics", "paper", "metal", "electronics", "batteries"],
    rejectedItems: ["hazardous waste", "food waste"],
    rating: 4.2,
    latitude: 47.6097,
    longitude: -122.3331,
    tags: ["recycling", "eco-friendly", "green"],
    description: "Comprehensive recycling center for all your recyclable materials.",
    taxDeductible: false,
    pickupAvailable: false
  }
];

// Main function to run the import
async function importFacilities() {
  console.log("Starting facility import...");
  
  let facilities: Facility[];
  
  // Try to load from file
  try {
    const dataPath = path.resolve(process.cwd(), "data", "facilities.json");
    const jsonData = fs.readFileSync(dataPath, 'utf-8');
    const jsonFacilities = JSON.parse(jsonData);
    
    // Map JSON to facility format
    facilities = jsonFacilities.slice(0, 10).map((f: any) => ({
      name: f.title || f.name || "Unknown Facility",
      type: determineType(f),
      address: f.address || "Unknown Address",
      city: f.city || "Unknown City",
      state: f.state || "Unknown State",
      zipCode: f.postalCode || f.zip_code || "00000",
      phone: f.phone || f.phoneUnformatted,
      website: f.website,
      hours: f.hours || null,
      acceptedItems: f.acceptedItems || [],
      rejectedItems: f.rejectedItems || [],
      notes: f.notes,
      distance: typeof f.distance === 'number' ? f.distance : null,
      rating: f.rating || f.totalScore || 3.0,
      imageUrl: f.imageUrl,
      latitude: f.location?.lat || null,
      longitude: f.location?.lng || null,
      tags: f.tags || [f.categoryName].filter(Boolean),
      description: f.description || f.categoryName || null,
      taxDeductible: f.taxDeductible || (f.categoryName?.toLowerCase()?.includes('donat') || false),
      pickupAvailable: f.pickupAvailable || false
    }));
    
    console.log(`Loaded ${facilities.length} facilities from file`);
  } catch (error) {
    console.log("Error loading from file, using sample data:", error);
    facilities = sampleFacilities;
  }
  
  try {
    // First, create the facilities table if it doesn't exist
    await db.exec`
      CREATE TABLE IF NOT EXISTS facilities (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) CHECK (type IN ('donation', 'recycling', 'trash', 'mixed')),
        address VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        state VARCHAR(50) NOT NULL,
        zip_code VARCHAR(20) NOT NULL,
        phone VARCHAR(50),
        website VARCHAR(255),
        hours TEXT,
        accepted_items TEXT[],
        rejected_items TEXT[],
        notes TEXT,
        distance NUMERIC,
        rating NUMERIC NOT NULL DEFAULT 0,
        image_url VARCHAR(255),
        latitude NUMERIC(10,8),
        longitude NUMERIC(11,8),
        location GEOGRAPHY(POINT),
        tags TEXT[],
        description TEXT,
        tax_deductible BOOLEAN DEFAULT false,
        pickup_available BOOLEAN DEFAULT false,
        extra_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `;
    
    console.log("Ensured facilities table exists");
    
    // Start a transaction
    await db.exec`BEGIN`;
    
    // Insert each facility
    for (const facility of facilities) {
      await db.exec`
        INSERT INTO facilities (
          name, type, address, city, state, zip_code, 
          phone, website, hours, accepted_items, rejected_items, 
          notes, distance, rating, image_url, latitude, longitude,
          tags, description, tax_deductible, pickup_available,
          created_at, updated_at
        ) VALUES (
          ${facility.name}, 
          ${facility.type}, 
          ${facility.address}, 
          ${facility.city}, 
          ${facility.state}, 
          ${facility.zipCode},
          ${facility.phone || null}, 
          ${facility.website || null}, 
          ${facility.hours || null},
          ${facility.acceptedItems || []}, 
          ${facility.rejectedItems || []}, 
          ${facility.notes || null},
          ${facility.distance || null}, 
          ${facility.rating}, 
          ${facility.imageUrl || null},
          ${facility.latitude || null}, 
          ${facility.longitude || null},
          ${facility.tags || []}, 
          ${facility.description || null},
          ${facility.taxDeductible}, 
          ${facility.pickupAvailable},
          NOW(), 
          NOW()
        )
      `;
      console.log(`Inserted facility: ${facility.name}`);
    }
    
    // Commit transaction
    await db.exec`COMMIT`;
    
    console.log(`Successfully imported ${facilities.length} facilities`);
  } catch (error) {
    // Rollback on error
    await db.exec`ROLLBACK`;
    console.error("Error importing facilities:", error);
  }
}

// Helper function to determine facility type
function determineType(facility: any): 'donation' | 'recycling' | 'trash' | 'mixed' {
  const category = (facility.categoryName || '').toLowerCase();
  
  if (category.includes('recycl')) return 'recycling';
  if (category.includes('donat') || category.includes('charity') || category.includes('thrift')) return 'donation';
  if (category.includes('waste') || category.includes('trash') || category.includes('dispos')) return 'trash';
  
  return 'mixed';
}

// Run the import function
importFacilities()
  .then(() => console.log("Import process complete"))
  .catch(err => console.error("Import failed:", err)); 