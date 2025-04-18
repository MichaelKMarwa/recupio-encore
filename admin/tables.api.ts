import { api } from "encore.dev/api";
import { db } from "../shared/db";

interface TableInfo {
  table_name: string;
  column_count: number;
  row_estimate: number;
}

// API endpoint to list all tables in the database with column and row count estimates
export const listTables = api(
  { method: "GET", path: "/tables", expose: true },
  async (): Promise<{ 
    success: boolean;
    tables: TableInfo[];
  }> => {
    try {
      console.log("Fetching database table information...");
      
      const tables: TableInfo[] = [];
      
      // Query to get tables, column count, and estimated row counts
      for await (const row of db.query`
        SELECT 
          t.table_name,
          COUNT(c.column_name) AS column_count,
          COALESCE(pg_stat_get_numrows(pg_class.oid)::bigint, 0) AS row_estimate
        FROM 
          information_schema.tables t
        JOIN 
          information_schema.columns c ON t.table_name = c.table_name
        JOIN 
          pg_class ON pg_class.relname = t.table_name
        WHERE 
          t.table_schema = 'public'
        GROUP BY 
          t.table_name, pg_class.oid
        ORDER BY 
          t.table_name
      `) {
        tables.push({
          table_name: row.table_name,
          column_count: parseInt(row.column_count),
          row_estimate: parseInt(row.row_estimate)
        });
      }
      
      return {
        success: true,
        tables
      };
    } catch (error: any) {
      console.error("Error listing tables:", error);
      return {
        success: false,
        tables: []
      };
    }
  }
); 