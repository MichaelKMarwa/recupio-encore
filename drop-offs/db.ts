import { SQLDatabase } from "encore.dev/storage/sqldb";

// Define the drop-offs database
export const db = new SQLDatabase("drop-offs", {
  migrations: "./migrations",
});