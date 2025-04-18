import { api } from "encore.dev/api";
import { db } from "../../shared/db";
import * as fs from "fs";
import * as path from "path";

// Import API to insert facility data
export const insertFacilityData = api(
  { method: "POST", path: "/admin/facilities/data", expose: true },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      // Read and execute SQL scripts
      const facilitiesSql = fs.readFileSync(
        path.join(__dirname, "facilities.sql"),
        "utf8"
      );
      const facilityItemsSql = fs.readFileSync(
        path.join(__dirname, "facility_items.sql"),
        "utf8"
      );

      console.log("Executing facilities SQL...");
      await db.exec`${facilitiesSql}`;
      
      console.log("Executing facility items SQL...");
      await db.exec`${facilityItemsSql}`;

      // Verify data was inserted by checking counts
      let facilityCount = 0;
      for await (const row of db.query`SELECT COUNT(*) as count FROM facilities`) {
        facilityCount = parseInt(row.count?.toString() || '0', 10);
        break;
      }

      let itemCount = 0;
      for await (const row of db.query`SELECT COUNT(*) as count FROM items`) {
        itemCount = parseInt(row.count?.toString() || '0', 10);
        break;
      }

      let facilityItemCount = 0;
      for await (const row of db.query`SELECT COUNT(*) as count FROM facility_items`) {
        facilityItemCount = parseInt(row.count?.toString() || '0', 10);
        break;
      }

      return {
        success: true,
        message: `Data inserted successfully. Facilities: ${facilityCount}, Items: ${itemCount}, Facility-Item links: ${facilityItemCount}`
      };
    } catch (error: any) {
      console.error("Error inserting facility data:", error);
      return {
        success: false,
        message: `Error inserting data: ${error.message}`
      };
    }
  }
); 