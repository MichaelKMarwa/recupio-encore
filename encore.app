{
    "id": "corev2-g9p2",
    "lang": "typescript",
    "databases": {
        "main": {
            "migrations": "./shared/migrations",
            "provider": "postgresql",
            "connection_string": "postgresql://core-db-v1_owner:npg_OxVW2DXKq9sg@ep-steep-brook-a2x256e7-pooler.eu-central-1.aws.neon.tech/core-db-v1?sslmode=require"
        }
    },
    "external_connections": {
        "neon": {
            "url_secret": "NEON_CONNECTION_STRING"
        }
    },
    "sql_database_parameters": {
        "main": {
            "connection_string": "${NEON_CONNECTION_STRING}"
        }
    }
}