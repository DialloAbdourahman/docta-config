import { Request, Response } from "express";
import { SessionService } from "../services/sessionService";
import { OrchestrationResult } from "docta-package";
import { EnumStatusCode } from "docta-package";

export class SessionController {
  private sessionService: SessionService;

  constructor() {
    this.sessionService = new SessionService();
  }

  public bookSession = async (req: Request, res: Response): Promise<void> => {
    const periodId = req.params.periodId;
    const result = await this.sessionService.bookSession(
      periodId,
      req.currentUser!
    );
    res.status(200).json(
      OrchestrationResult.item<any>({
        code: EnumStatusCode.CREATED_SUCCESSFULLY,
        message: "Session created successfully.",
        data: result,
      })
    );
  };
}
