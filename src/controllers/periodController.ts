import { Request, Response } from "express";
import { PeriodService } from "../services/periodService";
import { OrchestrationResult } from "docta-package";
import { EnumStatusCode } from "docta-package";
import { CreatePeriodDto } from "docta-package";
import { PeriodOutputDto } from "docta-package";

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
}
