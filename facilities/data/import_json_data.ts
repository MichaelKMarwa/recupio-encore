import { api } from "encore.dev/api";
import { db } from "../../shared/db";
import * as fs from "fs";
import * as path from "path";

// Define interfaces to match the JSON structure from Google Maps data
interface FacilityJSON {
  rank?: number;
  title: string;
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
  location?: {
    lat: number;
    lng: number;
  };
  totalScore?: number;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
  placeId?: string;
  categories?: string[];
  reviewsCount?: number;
  imageUrl?: string;
  url?: string;
  openingHours?: {
    day: string;
    hours: string;
  }[];
  additionalInfo?: any;
}

// Days of week mapping
const dayOfWeekMap: Record<string, number> = {
  "Monday": 1,
  "Tuesday": 2,
  "Wednesday": 3,
  "Thursday": 4,
  "Friday": 5,
  "Saturday": 6,
  "Sunday": 0
};

// API endpoint to import facilities from JSON
export const importFacilitiesFromJSON = api(
  { method: "POST", path: "/admin/facilities/import-json", expose: true },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      // Read the JSON file
      const jsonFilePath = path.join(process.cwd(), "data", "facilities.json");
      console.log(`Attempting to read file from: ${jsonFilePath}`);
      
      if (!fs.existsSync(jsonFilePath)) {
        console.error(`File not found: ${jsonFilePath}`);
        return {
          success: false,
          message: `Error importing data: File not found at ${jsonFilePath}`
        };
      }
      
      const jsonData = fs.readFileSync(jsonFilePath, "utf8");
      console.log(`File read successfully, size: ${jsonData.length} bytes`);
      
      // Parse the JSON
      const facilities: FacilityJSON[] = JSON.parse(jsonData);
      
      console.log(`Found ${facilities.length} facilities to import`);
      console.log(`Sample facility: ${JSON.stringify(facilities[0]?.title || 'No facilities found')}`);
      
      // Begin transaction
      await db.exec`BEGIN`;
      
      try {
        // Ensure facility types exist
        const allTypes = new Set<string>();
        facilities.forEach(facility => {
          if (facility.categories && facility.categories.length > 0) {
            facility.categories.forEach(type => allTypes.add(type));
          } else if (facility.categoryName) {
            allTypes.add(facility.categoryName);
          }
        });
        
        // Insert facility types
        for (const type of allTypes) {
          await db.exec`
            INSERT INTO facility_types (id, name, created_at)
            VALUES (uuid_generate_v4(), ${type}, NOW())
            ON CONFLICT (name) DO NOTHING
          `;
        }
        
        // Get type IDs for reference
        const typeMap = new Map<string, string>();
        for (const type of allTypes) {
          for await (const row of db.query`
            SELECT id FROM facility_types WHERE name = ${type}
          `) {
            typeMap.set(type, row.id);
            break;
          }
        }
        
        // Insert each facility
        let insertedCount = 0;
        let skippedCount = 0;
        
        for (const facility of facilities) {
          // Skip permanently closed facilities
          if (facility.permanentlyClosed) {
            console.log(`Skipping permanently closed facility: ${facility.title}`);
            skippedCount++;
            continue;
          }
          
          // Generate UUID
          const facilityId = await generateUUID();
          
          // Check if facility already exists to avoid duplicates
          let exists = false;
          for await (const row of db.query`
            SELECT id FROM facilities WHERE name = ${facility.title} AND address = ${facility.address}
          `) {
            exists = true;
            break;
          }
          
          if (exists) {
            console.log(`Facility already exists: ${facility.title}`);
            skippedCount++;
            continue;
          }
          
          const state = facility.state || '';
          
          // Insert facility with or without location
          if (facility.location && facility.location.lat && facility.location.lng) {
            await db.exec`
              INSERT INTO facilities (
                  id, name, description, address, city, state, zip_code,
                  phone, website, is_verified, location
              )
              VALUES (
                  ${facilityId},
                  ${facility.title},
                  ${facility.categoryName || null},
                  ${facility.address},
                  ${facility.city},
                  ${state},
                  ${facility.postalCode || ''},
                  ${facility.phone || null},
                  ${facility.url || null},
                  ${true},
                  ST_SetSRID(ST_MakePoint(${facility.location.lng}, ${facility.location.lat}), 4326)
              )
            `;
          } else {
            await db.exec`
              INSERT INTO facilities (
                  id, name, description, address, city, state, zip_code,
                  phone, website, is_verified
              )
              VALUES (
                  ${facilityId},
                  ${facility.title},
                  ${facility.categoryName || null},
                  ${facility.address},
                  ${facility.city || ''},
                  ${state},
                  ${facility.postalCode || ''},
                  ${facility.phone || null},
                  ${facility.url || null},
                  ${true}
              )
            `;
          }
          
          // Link facility with types
          if (facility.categories && facility.categories.length > 0) {
            for (const type of facility.categories) {
              const typeId = typeMap.get(type);
              if (typeId) {
                await db.exec`
                  INSERT INTO facility_type_mappings (facility_id, type_id, created_at)
                  VALUES (${facilityId}, ${typeId}, NOW())
                  ON CONFLICT (facility_id, type_id) DO NOTHING
                `;
              }
            }
          } else if (facility.categoryName) {
            const typeId = typeMap.get(facility.categoryName);
            if (typeId) {
              await db.exec`
                INSERT INTO facility_type_mappings (facility_id, type_id, created_at)
                VALUES (${facilityId}, ${typeId}, NOW())
                ON CONFLICT (facility_id, type_id) DO NOTHING
              `;
            }
          }
          
          // Insert facility hours from openingHours if available
          if (facility.openingHours && facility.openingHours.length > 0) {
            for (const hourInfo of facility.openingHours) {
              const dayOfWeek = dayOfWeekMap[hourInfo.day];
              if (dayOfWeek === undefined) continue;
              
              // Parse hours like "7 AM to 4 PM" or "Closed"
              const isClosed = hourInfo.hours === "Closed";
              let openTime = "09:00:00";
              let closeTime = "17:00:00";
              
              if (!isClosed) {
                const hoursParts = hourInfo.hours.split(" to ");
                if (hoursParts.length === 2) {
                  // Convert "7 AM" to "07:00:00"
                  openTime = convertToTime(hoursParts[0]);
                  closeTime = convertToTime(hoursParts[1]);
                }
              }
              
              await db.exec`
                INSERT INTO facility_hours (
                    id, facility_id, day_of_week, open_time, close_time, is_closed, created_at, updated_at
                )
                VALUES (
                    uuid_generate_v4(),
                    ${facilityId},
                    ${dayOfWeek},
                    ${openTime},
                    ${closeTime},
                    ${isClosed},
                    NOW(),
                    NOW()
                )
                ON CONFLICT (facility_id, day_of_week) DO UPDATE SET
                  open_time = EXCLUDED.open_time,
                  close_time = EXCLUDED.close_time,
                  is_closed = EXCLUDED.is_closed,
                  updated_at = NOW()
              `;
            }
          } else {
            // Insert default hours if none provided
            for (let day = 0; day <= 6; day++) {
              await db.exec`
                INSERT INTO facility_hours (
                    id, facility_id, day_of_week, open_time, close_time, is_closed, created_at, updated_at
                )
                VALUES (
                    uuid_generate_v4(),
                    ${facilityId},
                    ${day},
                    ${day >= 1 && day <= 5 ? '09:00:00' : (day === 6 ? '10:00:00' : '12:00:00')},
                    ${day >= 1 && day <= 5 ? '17:00:00' : (day === 6 ? '16:00:00' : '16:00:00')},
                    ${day === 0 || day === 6},
                    NOW(),
                    NOW()
                )
                ON CONFLICT (facility_id, day_of_week) DO NOTHING
              `;
            }
          }
          
          // Link facility with items based on additionalInfo if available
          if (facility.additionalInfo && facility.additionalInfo.Recycling) {
            for (const recyclingItem of facility.additionalInfo.Recycling) {
              for (const [itemName, isAccepted] of Object.entries(recyclingItem)) {
                if (isAccepted) {
                  // Find or create the item
                  let itemId = null;
                  
                  // Try to find the item by name
                  for await (const row of db.query`
                    SELECT id FROM items WHERE name = ${itemName}
                  `) {
                    itemId = row.id;
                    break;
                  }
                  
                  // If item doesn't exist, create it with a default category
                  if (!itemId) {
                    // Get or create 'Recyclables' category
                    let categoryId = null;
                    for await (const row of db.query`
                      SELECT id FROM categories WHERE name = 'Recyclables'
                    `) {
                      categoryId = row.id;
                      break;
                    }
                    
                    if (!categoryId) {
                      for await (const row of db.query`
                        INSERT INTO categories (id, name, icon, description, created_at, updated_at)
                        VALUES (uuid_generate_v4(), 'Recyclables', 'recycle', 'Recyclable materials', NOW(), NOW())
                        RETURNING id
                      `) {
                        categoryId = row.id;
                        break;
                      }
                    }
                    
                    // Create the item
                    for await (const row of db.query`
                      INSERT INTO items (id, name, category_id, notes, created_at, updated_at)
                      VALUES (uuid_generate_v4(), ${itemName}, ${categoryId}, 'Imported from Google Maps data', NOW(), NOW())
                      RETURNING id
                    `) {
                      itemId = row.id;
                      break;
                    }
                  }
                  
                  // Link item to facility
                  if (itemId) {
                    await db.exec`
                      INSERT INTO facility_items (id, facility_id, item_id, created_at)
                      VALUES (uuid_generate_v4(), ${facilityId}, ${itemId}, NOW())
                      ON CONFLICT (facility_id, item_id) DO NOTHING
                    `;
                  }
                }
              }
            }
          }
          
          insertedCount++;
        }
        
        // Commit transaction
        await db.exec`COMMIT`;
        
        return {
          success: true,
          message: `Successfully imported ${insertedCount} facilities, skipped ${skippedCount} facilities`
        };
        
      } catch (error) {
        // Rollback on error
        await db.exec`ROLLBACK`;
        throw error;
      }
      
    } catch (error: any) {
      console.error("Error importing facility data:", error);
      return {
        success: false,
        message: `Error importing data: ${error.message}`
      };
    }
  }
);

// Helper function to generate UUID
async function generateUUID(): Promise<string> {
  for await (const row of db.query`SELECT uuid_generate_v4() as uuid`) {
    return row.uuid;
  }
  throw new Error("Failed to generate UUID");
}

// Helper function to convert time strings like "7 AM" to "07:00:00"
function convertToTime(timeStr: string): string {
  try {
    timeStr = timeStr.trim();
    const isPM = timeStr.toUpperCase().includes("PM");
    const hourStr = timeStr.replace(/[^0-9]/g, "");
    let hour = parseInt(hourStr, 10);
    
    if (isPM && hour < 12) {
      hour += 12;
    } else if (!isPM && hour === 12) {
      hour = 0;
    }
    
    const hourFormatted = hour.toString().padStart(2, "0");
    return `${hourFormatted}:00:00`;
  } catch (e) {
    // Return default time if parsing fails
    return "09:00:00";
  }
} 