// payments/encore.service.ts
import { Service } from "encore.dev/service";
import { errorMiddleware, validationMiddleware, authMiddleware } from "../shared/middleware";

export default new Service("payments", {
  middlewares: [
    errorMiddleware,
    validationMiddleware,
    authMiddleware
  ]
});