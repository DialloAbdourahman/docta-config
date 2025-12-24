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
  PeriodModel,
  PeriodStatus,
  publishToTopicExchange,
  RoutingKey,
  SessionModel,
  EnumSessionStatus,
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
  ): Promise<ISessionDocument> => {
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

    return session;
  };

  public getPatientSession = async (
    sessionId: string,
    user: LoggedInUserTokenData
  ): Promise<ISessionDocument> => {
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

    return session;
  };

  public getPatientSessionsPaginated = async (
    page: number,
    itemsPerPage: number,
    user: LoggedInUserTokenData
  ): Promise<{
    sessions: ISessionDocument[];
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
    const sessions = docs as ISessionDocument[];

    return { sessions, totalItems };
  };

  public getDoctorSession = async (
    sessionId: string,
    user: LoggedInUserTokenData
  ): Promise<ISessionDocument> => {
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

    return session;
  };

  public getPatientFromSession = async (
    sessionId: string,
    user: LoggedInUserTokenData
  ): Promise<ISessionDocument> => {
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

    return session;
  };

  public getDoctorSessionsPaginated = async (
    page: number,
    itemsPerPage: number,
    user: LoggedInUserTokenData
  ): Promise<{
    sessions: ISessionDocument[];
    totalItems: number;
  }> => {
    // Verify the doctor exists
    const doctorDoc = (await DoctorModel.findOne({
      user: user.id,
    })) as IDoctorDocument;
    ValidateInfo.validateDoctor(doctorDoc);

    const skip = (page - 1) * itemsPerPage;

    const filter = {
      doctor: doctorDoc._id,
      status: {
        $in: [EnumSessionStatus.PAID, EnumSessionStatus.CANCELLED_BY_DOCTOR],
      },
    };

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

    const sessions = docs as ISessionDocument[];
    const totalItems = countResult[0]?.totalItems ?? 0;

    return { sessions, totalItems };
  };

  public cancelSessionByDirection = async ({
    sessionId,
    direction,
    user,
    cancelBeforeTimeInMins,
  }: {
    sessionId: string;
    direction: EnumRefundDirection;
    user: LoggedInUserTokenData;
    cancelBeforeTimeInMins: number;
  }): Promise<ISessionDocument> => {
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
      session.status === EnumSessionStatus.CANCELLED_BY_DOCTOR ||
      session.status === EnumSessionStatus.CANCELLED_BY_PATIENT ||
      session.status === EnumSessionStatus.CANCELLED_DUE_TO_TIME_OUT
    ) {
      throw new BadRequestError(
        EnumStatusCode.SESSION_CANCELLED_ALREADY,
        "Session is already cancelled"
      );
    }

    // Check if a doctor is trying to cancel a session that hasn't been paid for.
    if (
      session.status !== EnumSessionStatus.PAID &&
      direction === EnumRefundDirection.DOCTOR
    ) {
      throw new BadRequestError(
        EnumStatusCode.SESSION_NOT_PAID_FOR_DOCTOR_CANCELATION,
        "Session is not paid for to cancel by doctor"
      );
    }

    // Make sure that the period has not passed
    if (session.period.startTime < Date.now()) {
      throw new BadRequestError(
        EnumStatusCode.PERIOD_PASSED,
        "Session has already started"
      );
    }

    // Make sure that the cancellation window has not passed
    if (
      session.period.startTime <
      Date.now() + cancelBeforeTimeInMins * 60 * 1000
    ) {
      throw new BadRequestError(
        EnumStatusCode.CANCELATION_WINDOW_PASSED,
        "Cancellation window has passed"
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
    const sessionWasPaid = session.status === EnumSessionStatus.PAID;

    // Update session status and free the period
    session.status =
      direction === EnumRefundDirection.DOCTOR
        ? EnumSessionStatus.CANCELLED_BY_DOCTOR
        : EnumSessionStatus.CANCELLED_BY_PATIENT;
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
          refundDirection: direction,
        },
      });
    }
    return session;
  };
}
