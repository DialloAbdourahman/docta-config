import { Request, Response } from "express";
import { DoctorService } from "../services/doctorService";
import { OrchestrationResult } from "docta-package";
import { EnumStatusCode } from "docta-package";
import { DoctorOutputDto, DoctorFilterDto } from "docta-package";

export class DoctorController {
  private doctorService: DoctorService;

  constructor() {
    this.doctorService = new DoctorService();
  }

  public getDoctorBySlug = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { slug } = req.params;
    const result = await this.doctorService.getDoctorBySlug(slug);

    res.status(200).json(
      OrchestrationResult.item<DoctorOutputDto>({
        code: EnumStatusCode.RECOVERED_SUCCESSFULLY,
        message: "Doctor profile fetched successfully.",
        data: result,
      })
    );
  };

  public filterDoctors = async (req: Request, res: Response): Promise<void> => {
    const filters: DoctorFilterDto = req.body;
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const itemsPerPage = Math.max(
      1,
      parseInt(String(req.query.itemsPerPage || "10"), 10)
    );

    const { items, totalItems } = await this.doctorService.filterDoctors(
      filters,
      page,
      itemsPerPage
    );

    res.status(200).json(
      OrchestrationResult.paginated<DoctorOutputDto>({
        code: EnumStatusCode.RECOVERED_SUCCESSFULLY,
        message: "Doctors filtered successfully.",
        data: items,
        totalItems,
        itemsPerPage,
        page,
      })
    );
  };
}
