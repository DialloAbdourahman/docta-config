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

    this.router.get(
      "/doctor/me",
      requireAuth,
      verifyRoles([EnumUserRole.DOCTOR]),
      this.controller.getMyPeriods
    );

    this.router.get("/doctor/:doctorId", this.controller.getPeriodsByDoctor);

    this.router.delete(
      "/doctor/me/:periodId",
      requireAuth,
      verifyRoles([EnumUserRole.DOCTOR]),
      this.controller.deleteMyAvailablePeriod
    );
  }
}

export default new PeriodRouter().router;
