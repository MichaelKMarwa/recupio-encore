import { api } from "encore.dev/api";
import { db } from "../shared/db";

// Simple API endpoint to add sample facilities directly
export const addSampleFacilities = api(
  { method: "POST", path: "/admin/facilities/samples", expose: true },
  async (): Promise<{ success: boolean; message: string; count: number }> => {
    try {
      console.log("Adding sample facilities...");
      
      // Start transaction
      await db.exec`BEGIN`;
      
      // Ensure facility types exist
      await db.exec`
        INSERT INTO facility_types (id, name, created_at) VALUES 
        (uuid_generate_v4(), 'donation', NOW()),
        (uuid_generate_v4(), 'recycling', NOW()),
        (uuid_generate_v4(), 'disposal', NOW())
        ON CONFLICT (name) DO NOTHING
      `;
      
      // Get type IDs
      let donationTypeId = '';
      let recyclingTypeId = '';
      let disposalTypeId = '';
      
      for await (const row of db.query`SELECT id FROM facility_types WHERE name = 'donation'`) {
        donationTypeId = row.id;
        break;
      }
      
      for await (const row of db.query`SELECT id FROM facility_types WHERE name = 'recycling'`) {
        recyclingTypeId = row.id;
        break;
      }
      
      for await (const row of db.query`SELECT id FROM facility_types WHERE name = 'disposal'`) {
        disposalTypeId = row.id;
        break;
      }
      
      // Add a donation center
      let goodwillId = '';
      await db.exec`
        INSERT INTO facilities (
          id, name, description, address, city, state, zip_code, 
          phone, is_verified, created_at, updated_at
        ) VALUES (
          uuid_generate_v4(),
          'Goodwill Donation Center',
          'Accepts clothing, furniture, electronics, and household items.',
          '123 Main St',
          'Seattle',
          'WA',
          '98101',
          '206-555-1234',
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      
      for await (const row of db.query`
        SELECT id FROM facilities WHERE name = 'Goodwill Donation Center' LIMIT 1
      `) {
        goodwillId = row.id;
        break;
      }
      
      // Link facility with type
      if (goodwillId && donationTypeId) {
        await db.exec`
          INSERT INTO facility_type_mappings (facility_id, type_id, created_at)
          VALUES (${goodwillId}, ${donationTypeId}, NOW())
          ON CONFLICT DO NOTHING
        `;
      }
      
      // Add a recycling center
      let recyclingId = '';
      await db.exec`
        INSERT INTO facilities (
          id, name, description, address, city, state, zip_code, 
          phone, is_verified, created_at, updated_at
        ) VALUES (
          uuid_generate_v4(),
          'Green Earth Recycling',
          'Specializes in electronics and battery recycling.',
          '456 Pine Ave',
          'Seattle',
          'WA',
          '98101',
          '206-555-2345',
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      
      for await (const row of db.query`
        SELECT id FROM facilities WHERE name = 'Green Earth Recycling' LIMIT 1
      `) {
        recyclingId = row.id;
        break;
      }
      
      // Link facility with type
      if (recyclingId && recyclingTypeId) {
        await db.exec`
          INSERT INTO facility_type_mappings (facility_id, type_id, created_at)
          VALUES (${recyclingId}, ${recyclingTypeId}, NOW())
          ON CONFLICT DO NOTHING
        `;
      }
      
      // Commit transaction
      await db.exec`COMMIT`;
      
      // Get count of facilities
      let facilityCount = 0;
      for await (const row of db.query`SELECT COUNT(*) as count FROM facilities`) {
        facilityCount = parseInt(row.count?.toString() || '0', 10);
        break;
      }
      
      return {
        success: true,
        message: "Successfully added sample facilities",
        count: facilityCount
      };
    } catch (error: any) {
      // Rollback on error
      await db.exec`ROLLBACK`;
      console.error("Error adding sample facilities:", error);
      return {
        success: false,
        message: `Error: ${error.message}`,
        count: 0
      };
    }
  }
); 