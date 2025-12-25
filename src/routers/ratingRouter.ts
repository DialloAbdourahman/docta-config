import { Router } from "express";
import { RatingController } from "../controllers/ratingController";
import {
  CreateRatingDto,
  UpdateRatingDto,
  EnumUserRole,
  requireAuth,
  validationMiddleware,
  verifyRoles,
} from "docta-package";

class RatingRouter {
  public router: Router;
  private controller: RatingController;

  constructor() {
    this.router = Router();
    this.controller = new RatingController();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      "/session/:sessionId",
      requireAuth,
      verifyRoles([EnumUserRole.PATIENT]),
      validationMiddleware(CreateRatingDto),
      this.controller.createRating
    );

    this.router.patch(
      "/:ratingId",
      requireAuth,
      verifyRoles([EnumUserRole.PATIENT]),
      validationMiddleware(UpdateRatingDto),
      this.controller.updateRating
    );

    this.router.delete(
      "/:ratingId",
      requireAuth,
      verifyRoles([EnumUserRole.PATIENT]),
      this.controller.deleteRating
    );

    this.router.get(
      "/doctor/:doctorId",
      this.controller.getDoctorRatingsPaginated
    );
  }
}

export default new RatingRouter().router;
