import { api } from "encore.dev/api";
import { testConnection } from "../shared/db";
import { secret } from "encore.dev/config";

// Get direct connection string from secrets
const neonConnString = secret("NEON_CONNECTION_STRING");

// API endpoint to perform a direct test of Neon connectivity
export const directTest = api(
  { method: "GET", path: "/direct-test", expose: true },
  async (): Promise<{ 
    success: boolean; 
    message: string;
    connection_string?: string;
  }> => {
    try {
      console.log("Performing direct Neon database connection test...");
      
      // Test connection using the shared db module
      const connected = await testConnection();
      
      // Get a masked version of the connection string for debugging
      const connStr = neonConnString();
      const maskedConnStr = connStr.replace(/:[^:@]*@/, ":***@");
      
      if (connected) {
        return {
          success: true,
          message: "Direct database connection successful",
          connection_string: maskedConnStr
        };
      } else {
        return {
          success: false,
          message: "Direct database connection test failed, but no error was thrown",
          connection_string: maskedConnStr
        };
      }
    } catch (error: any) {
      console.error("Direct database test error:", error);
      return {
        success: false,
        message: `Direct database test error: ${error.message}`
      };
    }
  }
); 