// facilities/encore.service.ts
import { Service } from "encore.dev/service";
import { errorMiddleware, validationMiddleware, guestMiddleware } from "../shared/middleware";

export default new Service("facilities", {
  middlewares: [
    errorMiddleware,
    validationMiddleware,
    guestMiddleware
  ]
});