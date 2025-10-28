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
      this.calculateSessionPrice({
        doctorPrice: doctor.consultationFee,
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
      config: {
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

  private calculateSessionPrice = ({
    doctorPrice, // price per hour
    startTime,
    endTime,
    initialConfig,
  }: {
    startTime: number;
    endTime: number;
    doctorPrice: number; // price per hour
    initialConfig: {
      platformPercentage: number;
      collectionPercentage: number;
      disbursementPercentage: number;
    };
  }): {
    totalPrice: number;
    paymentApiPrice: number;
    platformPrice: number;
    doctorPrice: number;
  } => {
    // --- 1️⃣ Calculate session duration in hours ---
    const durationMs = endTime - startTime;
    const durationHours = durationMs / (1000 * 60 * 60); // convert ms → hours

    // --- 2️⃣ Compute doctor’s total price for this session ---
    const doctorPriceWithPeriodIncluded = doctorPrice * durationHours;

    // --- 3️⃣ Extract fee percentages ---
    const platformPct = initialConfig.platformPercentage / 100;
    const collectionPct = initialConfig.collectionPercentage / 100;
    const disbursementPct = initialConfig.disbursementPercentage / 100;

    // --- 4️⃣ Platform share ---
    const platformPrice = Math.ceil(
      doctorPriceWithPeriodIncluded * platformPct
    );

    // --- 5️⃣ Subtotal (doctor + platform) ---
    const subtotal = doctorPriceWithPeriodIncluded + platformPrice;

    // --- 6️⃣ Apply collection + disbursement on subtotal ---
    const totalFeePct = collectionPct + disbursementPct;
    const totalFees = Math.ceil(subtotal * totalFeePct);

    // --- 7️⃣ Final total the patient pays ---
    const totalPrice = Math.ceil(subtotal + totalFees);

    // --- 8️⃣ Return results ---
    return {
      totalPrice,
      paymentApiPrice: totalFees,
      platformPrice,
      doctorPrice: Math.ceil(doctorPriceWithPeriodIncluded),
    };
  };
}
