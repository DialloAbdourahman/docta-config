import { Router } from "express";
import { AdminController } from "../controllers/adminController";
import { validationMiddleware } from "docta-package";
import { CreateSpecialtyDto, UpdateSpecialtyDto } from "docta-package";
import { requireAuth } from "docta-package";
import { EnumUserRole } from "docta-package";
import { verifyRoles } from "docta-package";

class AdminRouter {
  public router: Router;
  private controller: AdminController;

  constructor() {
    this.router = Router();
    this.controller = new AdminController();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Specialties
    this.router.post(
      "/specialties",
      requireAuth,
      verifyRoles([EnumUserRole.ADMIN]),
      validationMiddleware(CreateSpecialtyDto),
      this.controller.createSpecialty
    );

    this.router.patch(
      "/specialties/:id",
      requireAuth,
      verifyRoles([EnumUserRole.ADMIN]),
      validationMiddleware(UpdateSpecialtyDto),
      this.controller.updateSpecialty
    );

    this.router.delete(
      "/specialties/:id",
      requireAuth,
      verifyRoles([EnumUserRole.ADMIN]),
      this.controller.deleteSpecialty
    );

    this.router.get(
      "/specialties",
      requireAuth,
      verifyRoles([EnumUserRole.ADMIN]),
      this.controller.listSpecialties
    );
  }
}

export default new AdminRouter().router;

// Deactive doctors.
// Delete doctors.
// Delete patients.
