// auth/encore.service.ts
import { Service } from "encore.dev/service";
import { authMiddleware, guestMiddleware } from "./auth.middleware";

// Define the auth service
export default new Service("auth");