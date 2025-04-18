import { SQLDatabase } from "encore.dev/storage/sqldb";

// Create a named main database that uses the external Neon database connection
// The connection string is specified in encore.app and .secrets.local.cue
export const db = new SQLDatabase("main", {
    migrations: "./migrations"
});

// Export a function to test the database connection directly
export async function testConnection(): Promise<boolean> {
  try {
    // Simple query to test connectivity
    const result = await db.queryRow`SELECT 1 as connected`;
    return result?.connected === 1;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}