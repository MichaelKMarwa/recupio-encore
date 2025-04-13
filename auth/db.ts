// auth/db.ts
import { SQLDatabase } from "encore.dev/storage/sqldb";

// Main shared database for the application
export const mainDB = new SQLDatabase("main", {
  migrations: "./migrations",
});

// Auth-specific database for auth-only tables
export const authDB = new SQLDatabase("auth", {
  migrations: "./migrations",
});

export const sharedDB = new SQLDatabase("shared", {
  migrations: "./migrations",
});