import { api } from "encore.dev/api";
import { db } from "../shared/db";
import fs from "fs";
import path from "path";

interface MigrationResult {
  success: boolean;
  message: string;
  appliedMigrations?: string[];
  error?: string;
}

// API endpoint to run migrations against Neon database
export const runMigrations = api(
  { method: "POST", path: "/run-migrations", expose: true },
  async (): Promise<MigrationResult> => {
    try {
      console.log("Running migrations on Neon database...");
      
      // Get the current applied migrations
      const appliedMigrations: string[] = [];
      let hasSchemaTable = false;
      
      // Check if schema_migrations table exists
      for await (const row of db.query`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'schema_migrations'
        ) as exists
      `) {
        hasSchemaTable = row.exists;
        break;
      }
      
      if (!hasSchemaTable) {
        // Create schema_migrations table if it doesn't exist
        await db.exec`
          CREATE TABLE schema_migrations (
            version bigint NOT NULL,
            dirty boolean NOT NULL,
            PRIMARY KEY (version)
          )
        `;
        console.log("Created schema_migrations table");
      } else {
        // Get applied migrations
        for await (const row of db.query`SELECT version FROM schema_migrations ORDER BY version`) {
          appliedMigrations.push(row.version.toString());
        }
        console.log("Current migrations:", appliedMigrations);
      }
      
      // Get migrations from shared/migrations directory
      const migrationsDir = path.join(process.cwd(), "shared", "migrations");
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith(".up.sql"))
        .sort();
      
      console.log("Available migrations:", migrationFiles);
      
      // Apply each migration if not already applied
      const newlyAppliedMigrations: string[] = [];
      
      for (const migrationFile of migrationFiles) {
        const versionMatch = migrationFile.match(/^(\d+)_/);
        if (!versionMatch) continue;
        
        const version = versionMatch[1];
        if (appliedMigrations.includes(version)) {
          console.log(`Migration ${migrationFile} already applied, skipping`);
          continue;
        }
        
        console.log(`Applying migration ${migrationFile}...`);
        const migrationPath = path.join(migrationsDir, migrationFile);
        const migrationSQL = fs.readFileSync(migrationPath, "utf8");
        
        try {
          // Start transaction
          await db.exec`BEGIN`;
          
          // Apply migration by executing each statement separately
          const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
          for (const statement of statements) {
            if (statement.trim()) {
              // Use template literals for each statement
              await db.exec`${statement}`;
            }
          }
          
          // Update schema_migrations table
          await db.exec`
            INSERT INTO schema_migrations (version, dirty)
            VALUES (${parseInt(version)}, false)
          `;
          
          // Commit transaction
          await db.exec`COMMIT`;
          
          newlyAppliedMigrations.push(migrationFile);
          console.log(`Successfully applied migration ${migrationFile}`);
        } catch (error: any) {
          // Rollback on error
          await db.exec`ROLLBACK`;
          console.error(`Error applying migration ${migrationFile}:`, error);
          return {
            success: false,
            message: `Failed to apply migration ${migrationFile}`,
            appliedMigrations: newlyAppliedMigrations,
            error: error.message
          };
        }
      }
      
      return {
        success: true,
        message: newlyAppliedMigrations.length > 0 
          ? `Successfully applied ${newlyAppliedMigrations.length} migrations` 
          : "No new migrations to apply",
        appliedMigrations: newlyAppliedMigrations
      };
    } catch (error: any) {
      console.error("Error running migrations:", error);
      return {
        success: false,
        message: "Error running migrations",
        error: error.message
      };
    }
  }
); 