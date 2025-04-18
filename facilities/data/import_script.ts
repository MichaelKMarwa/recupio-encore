import { importFacilitiesFromJSON } from "./import_json_data";

async function runImport() {
  try {
    console.log("Starting import of facilities from JSON...");
    const result = await importFacilitiesFromJSON();
    console.log(result.message);
  } catch (error) {
    console.error("Import failed:", error);
  }
}

// Run the import
runImport();

// To run this script, use: encore run
// Then call the API endpoint: curl -X POST http://localhost:4000/admin/facilities/import-json 