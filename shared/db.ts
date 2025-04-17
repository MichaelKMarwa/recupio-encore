import { SQLDatabase } from "encore.dev/storage/sqldb";

// Create a named main database that uses the external Neon database
export const db = new SQLDatabase("main", {
    migrations: "./migrations"
});