// premium/encore.service.ts
import { Service } from "encore.dev/service";
import { errorMiddleware, validationMiddleware, authMiddleware, premiumMiddleware } from "../shared/middleware";

// Define the premium service
export default new Service("premium");