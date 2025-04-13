// facilities/db.ts
import { SQLDatabase } from "encore.dev/storage/sqldb";

export const db = new SQLDatabase("facilities", {
  migrations: "./migrations",
});