import { Router } from "express";
import { AdminController } from "../controllers/adminController";
import { validationMiddleware } from "docta-package";
import {
  CreateSpecialtyDto,
  UpdateSpecialtyDto,
  CreateExpertiseDto,
  UpdateExpertiseDto,
} from "docta-package";
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

    // Expertises
    this.router.post(
      "/expertises",
      requireAuth,
      verifyRoles([EnumUserRole.ADMIN]),
      validationMiddleware(CreateExpertiseDto),
      this.controller.createExpertise
    );

    this.router.patch(
      "/expertises/:id",
      requireAuth,
      verifyRoles([EnumUserRole.ADMIN]),
      validationMiddleware(UpdateExpertiseDto),
      this.controller.updateExpertise
    );

    this.router.delete(
      "/expertises/:id",
      requireAuth,
      verifyRoles([EnumUserRole.ADMIN]),
      this.controller.deleteExpertise
    );

    this.router.get(
      "/expertises",
      requireAuth,
      verifyRoles([EnumUserRole.ADMIN]),
      this.controller.listExpertises
    );
  }
}

export default new AdminRouter().router;

// Deactive doctors.
// Delete doctors.
// Delete patients.
