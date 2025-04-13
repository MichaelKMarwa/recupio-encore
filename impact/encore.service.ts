import { Service } from "encore.dev/service";
import { errorMiddleware, validationMiddleware, authMiddleware } from "../shared/middleware";

export default new Service("impact", {
  middlewares: [
    errorMiddleware,
    validationMiddleware,
    authMiddleware
  ]
});