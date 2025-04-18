import { api } from "encore.dev/api";
import { db } from "../shared/db";

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

// API endpoint to get schema details for a specific table
export const getTableSchema = api(
  { method: "GET", path: "/table-schema/:tableName", expose: true },
  async (params: { tableName: string }): Promise<{ 
    success: boolean;
    table_name: string;
    columns: ColumnInfo[];
    error?: string;
  }> => {
    try {
      console.log(`Fetching schema for table: ${params.tableName}`);
      
      // Check if table exists
      const tableExists = await db.queryRow`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = ${params.tableName}
        ) as exists
      `;
      
      if (!tableExists || !tableExists.exists) {
        return {
          success: false,
          table_name: params.tableName,
          columns: [],
          error: `Table '${params.tableName}' does not exist`
        };
      }
      
      const columns: ColumnInfo[] = [];
      
      // Query to get column information
      for await (const row of db.query`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM 
          information_schema.columns
        WHERE 
          table_schema = 'public'
          AND table_name = ${params.tableName}
        ORDER BY 
          ordinal_position
      `) {
        columns.push({
          column_name: row.column_name,
          data_type: row.data_type,
          is_nullable: row.is_nullable,
          column_default: row.column_default
        });
      }
      
      return {
        success: true,
        table_name: params.tableName,
        columns
      };
    } catch (error: any) {
      console.error(`Error fetching schema for table ${params.tableName}:`, error);
      return {
        success: false,
        table_name: params.tableName,
        columns: [],
        error: error.message
      };
    }
  }
); 