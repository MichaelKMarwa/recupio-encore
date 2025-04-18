{
    "id": "corev2-g9p2",
    "lang": "typescript",
    "name": "recupio",
    "services": [
        "admin",
        "auth",
        "drop-offs",
        "facilities",
        "guest",
        "impact",
        "items",
        "payments",
        "premium",
        "shared"
    ],
    "databases": {
        "main": {
            "migrations": "./shared/migrations",
            "provider": "postgresql",
            "connection_string": "${NEON_CONNECTION_STRING}"
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