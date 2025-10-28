import {
  BadRequestError,
  EnumStatusCode,
  IPatientDocument,
  IPeriodDocument,
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
      totalPrice,
      doctorPrice,
      platformPrice,
      paymentApiPrice,
      meta: {
        originalDoctorConsultationFeePerHour: doctor.consultationFeePerHour,
        platformPercentage: config.platformPercentage,
        collectionPercentage: config.collectionPercentage,
        disbursementPercentage: config.disbursementPercentage,
      },
    });

    // Update the period
    period.status = PeriodStatus.Occupied;
    // period.session = session

    // Save data
    await session.save();
    await period.save();

    return new SessionPatientOutputDto(session);
  };
}
