import {
  BadRequestError,
  EnumRefundDirection,
  EnumStatusCode,
  Exchanges,
  InitiateRefundEvent,
  IPatientDocument,
  IPeriodDocument,
  ISessionDocument,
  NotFoundError,
  PatientModel,
  PatientPublicOutputDto,
  PeriodModel,
  PeriodStatus,
  publishToTopicExchange,
  RoutingKey,
  SessionDoctorOutputDto,
  SessionModel,
  SessionPatientOutputDto,
  SessionStatus,
  ValidateInfo,
} from "docta-package";
import { IDoctorDocument, DoctorModel } from "docta-package";
import { LoggedInUserTokenData } from "docta-package";
import { config } from "../config";
import { PeriodUtils } from "../utils/period.utils";
import mongoose from "mongoose";

export class SessionService {
  public bookSession = async (
    periodId: string,
    user: LoggedInUserTokenData
  ): Promise<SessionPatientOutputDto> => {
    // Get the patient
    const patient: IPatientDocument | null = await PatientModel.findOne({
      user: user.id,
      isDeleted: false,
    }).populate("user");
    if (!patient) {
      throw new NotFoundError(
        EnumStatusCode.PATIENT_NOT_FOUND,
        "Patient not found"
      );
    }

    // Get the period
    const period: IPeriodDocument | null = await PeriodModel.findOne({
      _id: periodId,
      isDeleted: false,
    });
    if (!period) {
      throw new NotFoundError(
        EnumStatusCode.PERIOD_NOT_FOUND,
        "Period not found"
      );
    }
    if (period.status === PeriodStatus.Occupied) {
      throw new BadRequestError(
        EnumStatusCode.PERIOD_OCCUPIED,
        "Period occupied"
      );
    }

    if (Date.now() > period.startTime) {
      throw new BadRequestError(EnumStatusCode.PERIOD_PASSED, "Period passed");
    }

    // Get the doctor
    const doctor: IDoctorDocument | null = (await DoctorModel.findOne({
      _id: String(period.doctor),
      isDeleted: false,
      isVisible: true,
    })) as IDoctorDocument;
    ValidateInfo.validateDoctor(doctor);

    // Take into account the doctor's dontBookMeBeforeInMins attribute
    if (
      Date.now() + doctor.dontBookMeBeforeInMins * 60 * 1000 >
      period.startTime
    ) {
      throw new BadRequestError(
        EnumStatusCode.PERIOD_TOO_CLOSE_TO_START,
        "Cannot book this period because it's too close to the start time"
      );
    }

    const { totalPrice, paymentApiPrice, platformPrice, doctorPrice } =
      PeriodUtils.calculateSessionPrice({
        consultationFeePerHour: doctor.consultationFeePerHour,
        startTime: period.startTime,
        endTime: period.endTime,
        initialConfig: {
          platformPercentage: config.platformPercentage,
          collectionPercentage: config.collectionPercentage,
          disbursementPercentage: config.disbursementPercentage,
        },
      });

    // Create session
    const session: ISessionDocument = new SessionModel({
      period: period,
      patient: patient,
      doctor: doctor,
      pricing: {
        totalPrice,
        doctorPrice,
        platformPrice,
        paymentApiPrice,
      },
      meta: {
        originalDoctorConsultationFeePerHour: doctor.consultationFeePerHour,
        platformPercentage: config.platformPercentage,
        collectionPercentage: config.collectionPercentage,
        disbursementPercentage: config.disbursementPercentage,
      },
      expiresAt:
        Date.now() + config.sessionPaymentTimeExpireInMinutes * 60 * 1000,
    });

    // Update the period
    period.status = PeriodStatus.Occupied;

    // Save data
    const sessionTransaction = await mongoose.startSession();
    sessionTransaction.startTransaction();

    try {
      await session.save({ session: sessionTransaction });
      await period.save({ session: sessionTransaction });
      await sessionTransaction.commitTransaction();
      sessionTransaction.endSession();
    } catch (error) {
      await sessionTransaction.abortTransaction();
      sessionTransaction.endSession();
      throw error;
    }

    console.log(session);

    return new SessionPatientOutputDto(session);
  };

  public getPatientSession = async (
    sessionId: string,
    user: LoggedInUserTokenData
  ): Promise<SessionPatientOutputDto> => {
    // Get the patient
    const patient: IPatientDocument | null = await PatientModel.findOne({
      user: user.id,
      isDeleted: false,
    });
    if (!patient) {
      throw new NotFoundError(
        EnumStatusCode.PATIENT_NOT_FOUND,
        "Patient not found"
      );
    }

    // Get the session
    const session: ISessionDocument | null = await SessionModel.findOne({
      _id: sessionId,
      patient: patient,
    }).populate("period");

    if (!session) {
      throw new NotFoundError(EnumStatusCode.NOT_FOUND, "Session not found");
    }

    console.log(session);

    return new SessionPatientOutputDto(session);
  };

  public getPatientSessionsPaginated = async (
    page: number,
    itemsPerPage: number,
    user: LoggedInUserTokenData
  ): Promise<{
    items: SessionPatientOutputDto[];
    totalItems: number;
  }> => {
    // Get the patient
    const patient: IPatientDocument | null = await PatientModel.findOne({
      user: user.id,
      isDeleted: false,
    });
    if (!patient) {
      throw new NotFoundError(
        EnumStatusCode.PATIENT_NOT_FOUND,
        "Patient not found"
      );
    }

    const filter = { patient: patient._id };
    const skip = (page - 1) * itemsPerPage;

    const aggregationPipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: "periods",
          localField: "period",
          foreignField: "_id",
          as: "period",
        },
      },
      { $unwind: "$period" },
      { $sort: { "period.startTime": 1 } },
    ];

    const [docs, countResult] = await Promise.all([
      SessionModel.aggregate([
        ...aggregationPipeline,
        { $skip: skip },
        { $limit: itemsPerPage },
      ]),
      SessionModel.aggregate([
        ...aggregationPipeline,
        { $count: "totalItems" },
      ]),
    ]);

    const totalItems = countResult[0]?.totalItems ?? 0;

    const items = (docs as ISessionDocument[]).map(
      (s) => new SessionPatientOutputDto(s)
    );

    return { items, totalItems };
  };

  public getDoctorSession = async (
    sessionId: string,
    user: LoggedInUserTokenData
  ): Promise<SessionDoctorOutputDto> => {
    // Verify the doctor exists
    const doctorDoc = (await DoctorModel.findOne({
      user: user.id,
    })) as IDoctorDocument;
    ValidateInfo.validateDoctor(doctorDoc);

    // Get the session
    const session: ISessionDocument | null = await SessionModel.findOne({
      _id: sessionId,
      doctor: doctorDoc,
    })
      .populate("period")
      .populate("patient")
      .populate({
        path: "patient",
        populate: { path: "user" },
      });

    if (!session) {
      throw new NotFoundError(EnumStatusCode.NOT_FOUND, "Session not found");
    }

    return new SessionDoctorOutputDto(session);
  };

  public getPatientFromSession = async (
    sessionId: string,
    user: LoggedInUserTokenData
  ): Promise<PatientPublicOutputDto> => {
    // Verify the doctor exists
    const doctorDoc = (await DoctorModel.findOne({
      user: user.id,
    })) as IDoctorDocument;
    ValidateInfo.validateDoctor(doctorDoc);

    // Get the session
    const session: ISessionDocument | null = await SessionModel.findOne({
      _id: sessionId,
      doctor: doctorDoc,
    }).populate({
      path: "patient",
      populate: { path: "user" }, // populate nested user
    });

    if (!session) {
      throw new NotFoundError(EnumStatusCode.NOT_FOUND, "Session not found");
    }

    return new PatientPublicOutputDto(session.patient);
  };

  public getDoctorSessionsPaginated = async (
    page: number,
    itemsPerPage: number,
    user: LoggedInUserTokenData
  ): Promise<{
    items: SessionDoctorOutputDto[];
    totalItems: number;
  }> => {
    // Verify the doctor exists
    const doctorDoc = (await DoctorModel.findOne({
      user: user.id,
    })) as IDoctorDocument;
    ValidateInfo.validateDoctor(doctorDoc);

    const skip = (page - 1) * itemsPerPage;

    const filter = { doctor: doctorDoc._id };

    const aggregationPipeline: any[] = [
      { $match: filter },

      // Join period
      {
        $lookup: {
          from: "periods",
          localField: "period",
          foreignField: "_id",
          as: "period",
        },
      },
      { $unwind: "$period" },

      // Join patient
      {
        $lookup: {
          from: "patients",
          let: { patientId: "$patient" }, // reference session's patient
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$patientId"] } } },

            // Join user inside patient
            {
              $lookup: {
                from: "users",
                let: { userId: "$user" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
                ],
                as: "user",
              },
            },
            { $unwind: "$user" }, // unwind user inside patient
          ],
          as: "patient",
        },
      },
      { $unwind: "$patient" }, // unwind patient

      { $sort: { "period.startTime": 1 } },
    ];

    const [docs, countResult] = await Promise.all([
      SessionModel.aggregate([
        ...aggregationPipeline,
        { $skip: skip },
        { $limit: itemsPerPage },
      ]),
      SessionModel.aggregate([
        ...aggregationPipeline,
        { $count: "totalItems" },
      ]),
    ]);

    console.log(docs);

    const totalItems = countResult[0]?.totalItems ?? 0;

    const items = (docs as ISessionDocument[]).map(
      (s) => new SessionDoctorOutputDto(s)
    );

    return { items, totalItems };
  };

  public cancelSessionByDoctor = async (
    sessionId: string,
    user: LoggedInUserTokenData
  ): Promise<SessionDoctorOutputDto> => {
    // Verify the doctor exists
    const doctorDoc = (await DoctorModel.findOne({
      user: user.id,
    })) as IDoctorDocument;
    ValidateInfo.validateDoctor(doctorDoc);

    // Get the session with populated period
    const session: ISessionDocument | null = await SessionModel.findOne({
      _id: sessionId,
      doctor: doctorDoc,
    })
      .populate("period")
      .populate("patient")
      .populate("doctor")
      .populate({
        path: "patient",
        populate: { path: "user" },
      });

    if (!session) {
      throw new NotFoundError(EnumStatusCode.NOT_FOUND, "Session not found");
    }

    // Check if session is already cancelled
    if (
      session.status === SessionStatus.CANCELLED_BY_DOCTOR ||
      session.status === SessionStatus.CANCELLED_DUE_TO_TIME_OUT
    ) {
      throw new BadRequestError(
        EnumStatusCode.BAD_REQUEST,
        "Session is already cancelled"
      );
    }

    // Make sure that the period has not passed
    if (session.period.startTime < Date.now()) {
      throw new BadRequestError(
        EnumStatusCode.PERIOD_PASSED,
        "Session has already started"
      );
    }

    // Get the period
    const period: IPeriodDocument | null = await PeriodModel.findOne({
      _id: session.period._id,
      isDeleted: false,
    });

    if (!period) {
      throw new NotFoundError(
        EnumStatusCode.PERIOD_NOT_FOUND,
        "Period not found"
      );
    }

    // Check if session was paid
    const sessionWasPaid = session.status === SessionStatus.PAID;

    // Update session status and free the period
    session.status = SessionStatus.CANCELLED_BY_DOCTOR;
    session.cancelledAt = Date.now();
    period.status = PeriodStatus.Available;

    // Save both in a transaction
    const sessionTransaction = await mongoose.startSession();
    sessionTransaction.startTransaction();

    try {
      await session.save({ session: sessionTransaction });
      await period.save({ session: sessionTransaction });
      await sessionTransaction.commitTransaction();
      sessionTransaction.endSession();
    } catch (error) {
      await sessionTransaction.abortTransaction();
      sessionTransaction.endSession();
      throw error;
    }

    // Initiate the refund if session was paid
    if (sessionWasPaid) {
      publishToTopicExchange<InitiateRefundEvent>({
        exchange: Exchanges.DOCTA_EXCHANGE,
        routingKey: RoutingKey.INITIATE_REFUND,
        message: {
          sessionId: session.id,
          patientId: session.patient.id,
          doctorId: session.doctor.id,
          refundDirection: EnumRefundDirection.DOCTOR,
        },
      });
    }
    return new SessionDoctorOutputDto(session);
  };
}
