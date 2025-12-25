import { Request, Response } from "express";
import { RatingService } from "../services/ratingService";
import {
  CreateRatingDto,
  UpdateRatingDto,
  EnumStatusCode,
  OrchestrationResult,
  RatingOutputDto,
} from "docta-package";

export class RatingController {
  private ratingService: RatingService;

  constructor() {
    this.ratingService = new RatingService();
  }

  public createRating = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.params.sessionId;
    const createRatingDto: CreateRatingDto = req.body;

    const rating = await this.ratingService.createRating(
      sessionId,
      createRatingDto,
      req.currentUser!
    );

    res.status(201).json(
      OrchestrationResult.item<RatingOutputDto>({
        code: EnumStatusCode.CREATED_SUCCESSFULLY,
        message: "Rating created successfully.",
        data: new RatingOutputDto(rating),
      })
    );
  };

  public updateRating = async (req: Request, res: Response): Promise<void> => {
    const ratingId = req.params.ratingId;
    const updateRatingDto: UpdateRatingDto = req.body;

    const rating = await this.ratingService.updateRating(
      ratingId,
      updateRatingDto,
      req.currentUser!
    );

    res.status(200).json(
      OrchestrationResult.item<RatingOutputDto>({
        code: EnumStatusCode.UPDATED_SUCCESSFULLY,
        message: "Rating updated successfully.",
        data: new RatingOutputDto(rating),
      })
    );
  };

  public deleteRating = async (req: Request, res: Response): Promise<void> => {
    const ratingId = req.params.ratingId;

    const rating = await this.ratingService.deleteRating(
      ratingId,
      req.currentUser!
    );

    res.status(200).json(
      OrchestrationResult.item<RatingOutputDto>({
        code: EnumStatusCode.DELETED_SUCCESSFULLY,
        message: "Rating deleted successfully.",
        data: new RatingOutputDto(rating),
      })
    );
  };

  public getDoctorRatingsPaginated = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const doctorId = req.params.doctorId;
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const itemsPerPage = Math.max(
      1,
      parseInt(String(req.query.itemsPerPage || "10"), 10)
    );
    const ratingValue = req.query.rating
      ? parseInt(String(req.query.rating), 10)
      : undefined;

    const { ratings, totalItems } =
      await this.ratingService.getDoctorRatingsPaginated(
        doctorId,
        page,
        itemsPerPage,
        ratingValue
      );

    res.status(200).json(
      OrchestrationResult.paginated<RatingOutputDto>({
        code: EnumStatusCode.RECOVERED_SUCCESSFULLY,
        message: "Ratings fetched successfully.",
        data: ratings.map((r) => new RatingOutputDto(r)),
        totalItems,
        itemsPerPage,
        page,
      })
    );
  };
}
