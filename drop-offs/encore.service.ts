import { Service } from "encore.dev/service";
import { errorMiddleware, validationMiddleware, authMiddleware, guestMiddleware } from "../shared/middleware";

export default new Service("drop-offs", {
  middlewares: [
    errorMiddleware,
    validationMiddleware,
    authMiddleware, // Move auth before guest middleware
    guestMiddleware
  ]
});