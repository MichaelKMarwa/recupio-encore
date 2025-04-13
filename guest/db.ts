// guest/db.ts
import { SQLDatabase } from "encore.dev/storage/sqldb";

export const db = new SQLDatabase("guest", {
  migrations: "./migrations",
});