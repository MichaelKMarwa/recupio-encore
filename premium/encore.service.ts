// premium/encore.service.ts
import { Service } from "encore.dev/service";
import { errorMiddleware, validationMiddleware, authMiddleware, premiumMiddleware } from "../shared/middleware";

export default new Service("premium", {
  middlewares: [
    errorMiddleware,
    validationMiddleware,
    authMiddleware,
    premiumMiddleware
  ]
});