import { api } from "encore.dev/api";
import { db } from "../../shared/db";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';

// Get current file's directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API endpoint to directly run the SQL import script
export const importDirectSQL = api(
  { method: "POST", path: "/admin/facilities/direct-import", expose: true },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      console.log("Starting direct SQL import...");
      
      // Read the SQL file using process.cwd() instead of __dirname
      const sqlPath = path.join(process.cwd(), "facilities", "data", "direct_import.sql");
      console.log(`Reading SQL from: ${sqlPath}`);
      
      if (!fs.existsSync(sqlPath)) {
        console.error(`SQL file not found: ${sqlPath}`);
        return {
          success: false,
          message: `Error: SQL file not found at ${sqlPath}`
        };
      }
      
      const sqlScript = fs.readFileSync(sqlPath, "utf8");
      console.log(`SQL file read, size: ${sqlScript.length} bytes`);
      
      // Execute the SQL script
      await db.exec`${sqlScript}`;
      
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
        message: `Successfully ran SQL import. Facilities: ${facilityCount}, Items: ${itemCount}, Facility-Item links: ${facilityItemCount}`
      };
    } catch (error: any) {
      console.error("Error running SQL import:", error);
      return {
        success: false,
        message: `Error running SQL import: ${error.message}`
      };
    }
  }
); 