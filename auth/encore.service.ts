// auth/encore.service.ts
import { Service } from "encore.dev/service";
import { errorMiddleware, validationMiddleware } from "../shared/middleware";

export default new Service("auth", {
  middlewares: [
    errorMiddleware,
    validationMiddleware
  ]
});