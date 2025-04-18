import { api } from "encore.dev/api";
import { db } from "../shared/db";

// Create a simple API to check database connectivity
export const checkDB = api(
  { expose: true, method: "GET", path: "/db-status" }, 
  async (): Promise<{ message: string, connection: string, dbConnected: boolean, tableCount?: number, error?: string }> => {
    // Get the actual connection string from the environment
    const dbUrl = process.env.MAIN_DATABASE_URL || "Not found";
    let dbConnected = false;
    let tableCount;
    
    try {
      // Simple count query with explicit text casting
      const result = await db.queryRow<{count: number}>`
        SELECT COUNT(*)::int as count FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      dbConnected = true;
      tableCount = result?.count;
      
    } catch (error) {
      // Add error handling
      return {
        message: "Database connection failed",
        connection: dbUrl,
        dbConnected: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
    
    return {
      message: dbConnected ? "Database connection successful" : "Database connection failed",
      connection: dbUrl,
      dbConnected,
      tableCount
    };
  }
);

// Add a new endpoint to check environment variables related to the database
export const checkEnv = api(
  { expose: true, method: "GET", path: "/env-check" },
  async (): Promise<{ 
    mainDbUrl?: string,
    neonConnString?: string,
    allEnvVars: Record<string, string>
  }> => {
    // Get specific environment variables related to the database
    const mainDbUrl = process.env.MAIN_DATABASE_URL;
    const neonConnString = process.env.NEON_CONNECTION_STRING;
    
    // Get all environment variables (filtering out sensitive ones)
    const allEnvVars: Record<string, string> = {};
    
    for (const key in process.env) {
      // Only include environment variables related to databases or Encore, filter out secrets/passwords
      if (key.includes('DATABASE') || key.includes('DB_') || key.includes('ENCORE')) {
        const value = process.env[key] || '';
        // Mask passwords in connection strings
        allEnvVars[key] = value.replace(/:([^:@]+)@/, ':****@');
      }
    }
    
    return {
      mainDbUrl: mainDbUrl?.replace(/:([^:@]+)@/, ':****@'),
      neonConnString: neonConnString?.replace(/:([^:@]+)@/, ':****@'),
      allEnvVars
    };
  }
); 