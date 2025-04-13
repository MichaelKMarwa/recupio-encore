import { SQLDatabase } from "encore.dev/storage/sqldb";

export const mainDB = new SQLDatabase("main", {
    migrations: {
        path: "migrations"
    }
});