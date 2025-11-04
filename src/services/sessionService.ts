import {
  BadRequestError,
  EnumStatusCode,
  IPatientDocument,
  IPeriodDocument,
  ISession,
  ISessionDocument,
  NotFoundError,
  PatientModel,
  PatientPublicOutputDto,
  PeriodModel,
  PeriodStatus,
  SessionDoctorOutputDto,
  SessionModel,
  SessionPatientOutputDto,
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

    // if (period.startTime < Date.now()) {
    //   throw new BadRequestError(EnumStatusCode.PERIOD_PASSED, "Period passed");
    // }

    // Get the doctor
    const doctor: IDoctorDocument | null = (await DoctorModel.findOne({
      _id: String(period.doctor),
      isDeleted: false,
      isVisible: true,
    })) as IDoctorDocument;
    ValidateInfo.validateDoctor(doctor);

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
}
