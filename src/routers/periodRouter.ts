import { Router } from "express";
import { PeriodController } from "../controllers/periodController";
import { validationMiddleware } from "docta-package";
import { CreatePeriodDto } from "docta-package";
import { requireAuth } from "docta-package";
import { EnumUserRole } from "docta-package";
import { verifyRoles } from "docta-package";

class PeriodRouter {
  public router: Router;
  private controller: PeriodController;

  constructor() {
    this.router = Router();
    this.controller = new PeriodController();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      "/",
      requireAuth,
      verifyRoles([EnumUserRole.DOCTOR]),
      validationMiddleware(CreatePeriodDto),
      this.controller.createPeriod
    );
  }
}

export default new PeriodRouter().router;
