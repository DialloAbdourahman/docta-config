import { Request, Response } from "express";
import { SessionService } from "../services/sessionService";
import {
  EnumRefundDirection,
  OrchestrationResult,
  PatientPublicOutputDto,
  SessionDoctorOutputDto,
  SessionPatientOutputDto,
} from "docta-package";
import { EnumStatusCode } from "docta-package";
import { config } from "../config";

export class SessionController {
  private sessionService: SessionService;

  constructor() {
    this.sessionService = new SessionService();
  }

  public bookSession = async (req: Request, res: Response): Promise<void> => {
    const periodId = req.params.periodId;
    const session = await this.sessionService.bookSession(
      periodId,
      req.currentUser!
    );
    res.status(200).json(
      OrchestrationResult.item<SessionPatientOutputDto>({
        code: EnumStatusCode.CREATED_SUCCESSFULLY,
        message: "Session created successfully.",
        data: new SessionPatientOutputDto(session),
      })
    );
  };

  public getPatientSession = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const sessionId = req.params.sessionId;
    const session = await this.sessionService.getPatientSession(
      sessionId,
      req.currentUser!
    );
    res.status(200).json(
      OrchestrationResult.item<SessionPatientOutputDto>({
        code: EnumStatusCode.RECOVERED_SUCCESSFULLY,
        message: "Session created successfully.",
        data: new SessionPatientOutputDto(session),
      })
    );
  };

  public getDoctorSession = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const sessionId = req.params.sessionId;
    const session = await this.sessionService.getDoctorSession(
      sessionId,
      req.currentUser!
    );
    res.status(200).json(
      OrchestrationResult.item<SessionDoctorOutputDto>({
        code: EnumStatusCode.RECOVERED_SUCCESSFULLY,
        message: "Session created successfully.",
        data: new SessionDoctorOutputDto(session),
      })
    );
  };

  public getPatientFromSession = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const sessionId = req.params.sessionId;
    const session = await this.sessionService.getPatientFromSession(
      sessionId,
      req.currentUser!
    );
    res.status(200).json(
      OrchestrationResult.item<PatientPublicOutputDto>({
        code: EnumStatusCode.RECOVERED_SUCCESSFULLY,
        message: "Session created successfully.",
        data: new PatientPublicOutputDto(session.patient),
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

    const { sessions, totalItems } =
      await this.sessionService.getPatientSessionsPaginated(
        page,
        itemsPerPage,
        req.currentUser!
      );

    res.status(200).json(
      OrchestrationResult.paginated<SessionPatientOutputDto>({
        code: EnumStatusCode.RECOVERED_SUCCESSFULLY,
        message: "Sessions fetched successfully.",
        data: sessions.map((s) => new SessionPatientOutputDto(s)),
        totalItems,
        itemsPerPage,
        page,
      })
    );
  };

  public getDoctorSessionsPaginated = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const itemsPerPage = Math.max(
      1,
      parseInt(String(req.query.itemsPerPage || "10"), 10)
    );

    const { sessions, totalItems } =
      await this.sessionService.getDoctorSessionsPaginated(
        page,
        itemsPerPage,
        req.currentUser!
      );

    res.status(200).json(
      OrchestrationResult.paginated<SessionDoctorOutputDto>({
        code: EnumStatusCode.RECOVERED_SUCCESSFULLY,
        message: "Sessions fetched successfully.",
        data: sessions.map((s) => new SessionDoctorOutputDto(s)),
        totalItems,
        itemsPerPage,
        page,
      })
    );
  };

  public cancelSessionByDoctor = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const sessionId = req.params.sessionId;
    const session = await this.sessionService.cancelSessionByDoctor({
      sessionId,
      user: req.currentUser!,
    });
    res.status(200).json(
      OrchestrationResult.item<SessionDoctorOutputDto>({
        code: EnumStatusCode.UPDATED_SUCCESSFULLY,
        message: "Session cancelled successfully.",
        data: new SessionDoctorOutputDto(session),
      })
    );
  };

  public cancelSessionByPatient = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const sessionId = req.params.sessionId;
    const session = await this.sessionService.cancelSessionByPatient({
      sessionId,
      user: req.currentUser!,
    });
    res.status(200).json(
      OrchestrationResult.item<SessionPatientOutputDto>({
        code: EnumStatusCode.UPDATED_SUCCESSFULLY,
        message: "Session cancelled successfully.",
        data: new SessionPatientOutputDto(session),
      })
    );
  };
}
