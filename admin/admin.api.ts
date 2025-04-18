import { api } from "encore.dev/api";
import { db } from "../shared/db";

// API endpoint to verify Neon database connection
export const verifyNeonConnection = api(
  { method: "GET", path: "/verify-neon", expose: true },
  async (): Promise<{ 
    success: boolean; 
    message: string; 
    connectionInfo?: {
      current_database: string;
      user: string;
      server_version: string;
    };
  }> => {
    try {
      console.log("Verifying Neon database connection...");
      
      // Query the database to get connection information
      let dbInfo = {
        current_database: "",
        user: "",
        server_version: ""
      };
      
      // Get current database - explicit casting to text with an alias
      const dbNameResult = await db.queryRow`SELECT current_database()::text AS db_name`;
      if (dbNameResult) {
        dbInfo.current_database = dbNameResult.db_name;
      }
      
      // Get current user - explicit casting to text with an alias
      const userResult = await db.queryRow`SELECT current_user::text AS username`;
      if (userResult) {
        dbInfo.user = userResult.username;
      }
      
      // Get PostgreSQL version - explicit casting to text with an alias
      const versionResult = await db.queryRow`SELECT version()::text AS version_info`;
      if (versionResult) {
        dbInfo.server_version = versionResult.version_info;
      }
      
      return {
        success: true,
        message: "Successfully connected to Neon database",
        connectionInfo: dbInfo
      };
    } catch (error: any) {
      console.error("Error connecting to Neon database:", error);
      return {
        success: false,
        message: `Error connecting to Neon database: ${error.message}`
      };
    }
  }
); 