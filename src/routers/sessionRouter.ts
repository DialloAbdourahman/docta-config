import { Router } from "express";
import { SessionController } from "../controllers/sessionController";
import { EnumUserRole, requireAuth, verifyRoles } from "docta-package";

class SessionRouter {
  public router: Router;
  private controller: SessionController;

  constructor() {
    this.router = Router();
    this.controller = new SessionController();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      "/book/:periodId",
      requireAuth,
      verifyRoles([EnumUserRole.PATIENT]),
      this.controller.bookSession
    );
  }
}

export default new SessionRouter().router;
