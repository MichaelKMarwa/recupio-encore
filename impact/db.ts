import { SQLDatabase } from "encore.dev/storage/sqldb";

// Reference the auth and drop-offs databases
export const authDB = SQLDatabase.named("auth");
export const dropOffsDB = SQLDatabase.named("drop-offs");

// Initialize the impact database
export const db = new SQLDatabase("impact", {
  migrations: "./migrations",
});