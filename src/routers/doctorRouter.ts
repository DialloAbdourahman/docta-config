import { Router } from "express";
import { DoctorController } from "../controllers/doctorController";
import { DoctorFilterDto, validationMiddleware } from "docta-package";

class DoctorRouter {
  public router: Router;
  private controller: DoctorController;

  constructor() {
    this.router = Router();
    this.controller = new DoctorController();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Filter doctors with optional criteria (public route - no authentication required)
    this.router.post(
      "/filter",
      validationMiddleware(DoctorFilterDto),
      this.controller.filterDoctors
    );

    // Get doctor's profile by slug (public route - no authentication required)
    this.router.get("/:slug", this.controller.getDoctorBySlug);
  }
}

export default new DoctorRouter().router;
