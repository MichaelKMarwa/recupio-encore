// payments/db.ts
import { SQLDatabase } from "encore.dev/storage/sqldb";

// Reference the auth service's database instead of creating a new one
export const db = SQLDatabase.named("auth"); // Matches the auth service's database name