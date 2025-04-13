// auth/secrets.ts
import { secret } from "encore.dev/config";

export const jwtSecret = secret("JWT_SECRET");