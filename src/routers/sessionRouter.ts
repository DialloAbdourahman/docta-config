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

    this.router.get(
      "/patient",
      requireAuth,
      verifyRoles([EnumUserRole.PATIENT]),
      this.controller.getPatientSessionsPaginated
    );

    this.router.get(
      "/doctor",
      requireAuth,
      verifyRoles([EnumUserRole.DOCTOR]),
      this.controller.getDoctorSessionsPaginated
    );

    this.router.get(
      "/patient/:sessionId",
      requireAuth,
      verifyRoles([EnumUserRole.PATIENT]),
      this.controller.getPatientSession
    );

    this.router.get(
      "/doctor/:sessionId",
      requireAuth,
      verifyRoles([EnumUserRole.DOCTOR]),
      this.controller.getDoctorSession
    );
  }
}

export default new SessionRouter().router;
