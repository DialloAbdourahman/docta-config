import { Request, Response } from "express";
import { PeriodService } from "../services/periodService";
import { OrchestrationResult } from "docta-package";
import { EnumStatusCode } from "docta-package";
import { CreatePeriodDto } from "docta-package";
import { PeriodOutputDto } from "docta-package";
import { PeriodDoctorOutputDto } from "docta-package";

export class PeriodController {
  private periodService: PeriodService;

  constructor() {
    this.periodService = new PeriodService();
  }

  public createPeriod = async (req: Request, res: Response): Promise<void> => {
    const dto: CreatePeriodDto = req.body;
    console.log(`Creating period with data: ${dto}`);
    const result = await this.periodService.createPeriod(dto, req.currentUser!);
    res.status(201).json(
      OrchestrationResult.item<PeriodOutputDto>({
        code: EnumStatusCode.CREATED_SUCCESSFULLY,
        message: "Period created successfully.",
        data: result,
      })
    );
  };

  public getPeriodsOfDoctor = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { doctorId } = req.params;
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      res.status(400).json({
        code: EnumStatusCode.VALIDATION_ERROR,
        message: "startTime and endTime query parameters are required",
      });
      return;
    }

    const result = await this.periodService.getPeriodsOfDoctorAndTimeRange(
      doctorId,
      Number(startTime),
      Number(endTime)
    );

    res.status(200).json(
      OrchestrationResult.list<PeriodOutputDto>({
        code: EnumStatusCode.RECOVERED_SUCCESSFULLY,
        message: "Periods retrieved successfully.",
        data: result,
      })
    );
  };

  public getMyPeriods = async (req: Request, res: Response): Promise<void> => {
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      res.status(400).json({
        code: EnumStatusCode.VALIDATION_ERROR,
        message: "startTime and endTime query parameters are required",
      });
      return;
    }

    const result = await this.periodService.getMyPeriodsByTimeRange(
      req.currentUser!,
      Number(startTime),
      Number(endTime)
    );

    res.status(200).json(
      OrchestrationResult.list<PeriodDoctorOutputDto>({
        code: EnumStatusCode.RECOVERED_SUCCESSFULLY,
        message: "My periods retrieved successfully.",
        data: result,
      })
    );
  };

  public deleteMyAvailablePeriod = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { periodId } = req.params;

    await this.periodService.deleteMyAvailablePeriod(
      req.currentUser!,
      periodId
    );

    res.status(200).json(
      OrchestrationResult.item({
        code: EnumStatusCode.DELETED_SUCCESSFULLY,
        message: "Period deleted successfully.",
      })
    );
  };
}
