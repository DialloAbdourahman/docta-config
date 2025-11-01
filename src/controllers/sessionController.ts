import { Request, Response } from "express";
import { SessionService } from "../services/sessionService";
import { OrchestrationResult, SessionPatientOutputDto } from "docta-package";
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
      OrchestrationResult.item<SessionPatientOutputDto>({
        code: EnumStatusCode.CREATED_SUCCESSFULLY,
        message: "Session created successfully.",
        data: result,
      })
    );
  };

  public getPatientSession = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const sessionId = req.params.sessionId;
    const result = await this.sessionService.getPatientSession(
      sessionId,
      req.currentUser!
    );
    res.status(200).json(
      OrchestrationResult.item<SessionPatientOutputDto>({
        code: EnumStatusCode.CREATED_SUCCESSFULLY,
        message: "Session created successfully.",
        data: result,
      })
    );
  };

  public getPatientSessionsPaginated = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const itemsPerPage = Math.max(
      1,
      parseInt(String(req.query.itemsPerPage || "10"), 10)
    );

    const { items, totalItems } =
      await this.sessionService.getPatientSessionsPaginated(
        page,
        itemsPerPage,
        req.currentUser!
      );

    res.status(200).json(
      OrchestrationResult.paginated<SessionPatientOutputDto>({
        code: EnumStatusCode.RECOVERED_SUCCESSFULLY,
        message: "Sessions fetched successfully.",
        data: items,
        totalItems,
        itemsPerPage,
        page,
      })
    );
  };
}
