import {
  BadRequestError,
  EnumStatusCode,
  IPatientDocument,
  IPeriodDocument,
  ISession,
  ISessionDocument,
  NotFoundError,
  PatientModel,
  PeriodModel,
  PeriodStatus,
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
    if (period.startTime < Date.now()) {
      throw new BadRequestError(EnumStatusCode.PERIOD_PASSED, "Period passed");
    }

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
    }).populate("user");
    if (!patient) {
      throw new NotFoundError(
        EnumStatusCode.PATIENT_NOT_FOUND,
        "Patient not found"
      );
    }

    // Get the session
    const session: ISessionDocument | null = await SessionModel.findById({
      _id: sessionId,
      patient: patient,
    }).populate("period");

    console.log(session);

    if (!session) {
      throw new NotFoundError(EnumStatusCode.NOT_FOUND, "Session not found");
    }

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
    }).populate("user");
    if (!patient) {
      throw new NotFoundError(
        EnumStatusCode.PATIENT_NOT_FOUND,
        "Patient not found"
      );
    }
    const filter = { patient: patient._id };
    const skip = (page - 1) * itemsPerPage;
    // const [docs, totalItems] = await Promise.all([
    //   SessionModel.find(filter)
    //     .skip(skip)
    //     .limit(itemsPerPage)
    //     .populate("period"),

    //   SessionModel.countDocuments(filter),
    // ]);
    const [docs, totalItems] = await Promise.all([
      SessionModel.aggregate([
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
        { $skip: skip },
        { $limit: itemsPerPage },
      ]),

      SessionModel.countDocuments(filter),
    ]);

    const items = (docs as ISessionDocument[]).map(
      (s) => new SessionPatientOutputDto(s)
    );
    return { items, totalItems };
  };
}
