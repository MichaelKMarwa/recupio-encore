import { api } from "encore.dev/api";

// Create a simple API to check database connectivity and report the connection string
export const checkDB = api(
  { expose: true, method: "GET", path: "/db-status" }, 
  async (): Promise<{ message: string, connection: string }> => {
    // Get the actual connection string from the environment
    const dbUrl = process.env.MAIN_DATABASE_URL || "Not found";
    
    return {
      message: "Database connection details",
      connection: dbUrl
    };
  }
); 