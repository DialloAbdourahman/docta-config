import { Request, Response } from "express";
import { AdminService } from "../services/adminService";
import { OrchestrationResult } from "docta-package";
import { EnumStatusCode } from "docta-package";
import {
  CreateSpecialtyDto,
  UpdateSpecialtyDto,
  CreateExpertiseDto,
  UpdateExpertiseDto,
} from "docta-package";
import {
  SpecialtyAdminOutputDto,
  SpecialtyOutputDto,
  ExpertiseAdminOutputDto,
  ExpertiseOutputDto,
} from "docta-package";

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  public createSpecialty = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const dto: CreateSpecialtyDto = req.body;
    const result = await this.adminService.createSpecialty(
      dto,
      req.currentUser!
    );
    res.status(201).json(
      OrchestrationResult.item<SpecialtyOutputDto>({
        code: EnumStatusCode.CREATED_SUCCESSFULLY,
        message: "Specialty created successfully.",
        data: result,
      })
    );
  };

  public updateSpecialty = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const id = req.params.id;
    const dto: UpdateSpecialtyDto = req.body;
    const result = await this.adminService.updateSpecialty(
      id,
      dto,
      req.currentUser!
    );
    res.status(200).json(
      OrchestrationResult.item<SpecialtyOutputDto>({
        code: EnumStatusCode.UPDATED_SUCCESSFULLY,
        message: "Specialty updated successfully.",
        data: result,
      })
    );
  };

  public deleteSpecialty = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const id = req.params.id;
    await this.adminService.deleteSpecialty(id, req.currentUser!);
    res.status(200).json(
      OrchestrationResult.item({
        code: EnumStatusCode.DELETED_SUCCESSFULLY,
        message: "Specialty deleted successfully.",
      })
    );
  };

  public listSpecialties = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const itemsPerPage = Math.max(
      1,
      parseInt(String(req.query.itemsPerPage || "10"), 10)
    );

    const { items, totalItems } = await this.adminService.listSpecialties(
      page,
      itemsPerPage
    );

    res.status(200).json(
      OrchestrationResult.paginated<SpecialtyAdminOutputDto>({
        code: EnumStatusCode.RECOVERED_SUCCESSFULLY,
        message: "Specialties fetched successfully.",
        data: items,
        totalItems,
        itemsPerPage,
        page,
      })
    );
  };

  public createExpertise = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const dto: CreateExpertiseDto = req.body;
    const result = await this.adminService.createExpertise(
      dto,
      req.currentUser!
    );
    res.status(201).json(
      OrchestrationResult.item<ExpertiseOutputDto>({
        code: EnumStatusCode.CREATED_SUCCESSFULLY,
        message: "Expertise created successfully.",
        data: result,
      })
    );
  };

  public updateExpertise = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const id = req.params.id;
    const dto: UpdateExpertiseDto = req.body;
    const result = await this.adminService.updateExpertise(
      id,
      dto,
      req.currentUser!
    );
    res.status(200).json(
      OrchestrationResult.item<ExpertiseOutputDto>({
        code: EnumStatusCode.UPDATED_SUCCESSFULLY,
        message: "Expertise updated successfully.",
        data: result,
      })
    );
  };

  public deleteExpertise = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const id = req.params.id;
    await this.adminService.deleteExpertise(id, req.currentUser!);
    res.status(200).json(
      OrchestrationResult.item({
        code: EnumStatusCode.DELETED_SUCCESSFULLY,
        message: "Expertise deleted successfully.",
      })
    );
  };

  public listExpertises = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const itemsPerPage = Math.max(
      1,
      parseInt(String(req.query.itemsPerPage || "10"), 10)
    );

    const { items, totalItems } = await this.adminService.listExpertises(
      page,
      itemsPerPage
    );

    res.status(200).json(
      OrchestrationResult.paginated<ExpertiseAdminOutputDto>({
        code: EnumStatusCode.RECOVERED_SUCCESSFULLY,
        message: "Expertises fetched successfully.",
        data: items,
        totalItems,
        itemsPerPage,
        page,
      })
    );
  };
}
