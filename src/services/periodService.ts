import {
  BadRequestError,
  EnumStatusCode,
  IDoctorDocument,
  PeriodStatus,
  ValidateInfo,
} from "docta-package";
import { LoggedInUserTokenData } from "docta-package";
import { PeriodModel } from "docta-package";
import { CreatePeriodDto } from "docta-package";
import { PeriodOutputDto } from "docta-package";
import { PeriodDoctorOutputDto } from "docta-package";
import { DoctorModel } from "docta-package";
import { NotFoundError } from "docta-package";
import { PeriodUtils } from "../utils/period.utils";

export class PeriodService {
  public createPeriod = async (
    dto: CreatePeriodDto,
    user: LoggedInUserTokenData
  ): Promise<PeriodOutputDto> => {
    // Verify the doctor exists
    const doctorDoc = (await DoctorModel.findOne({
      user: user.id,
    })) as IDoctorDocument;
    ValidateInfo.validateDoctor(doctorDoc);

    // Make sure that we have a valid time gap
    const isValidTimeGap = PeriodUtils.isValidTimeGap(
      dto.startTime,
      dto.endTime
    );
    if (!isValidTimeGap) {
      throw new BadRequestError(
        EnumStatusCode.INVALID_TIME_GAP,
        "Invalid time gap"
      );
    }

    // Make sure it is the same day
    const isSameDay = PeriodUtils.isSameDayInZone(
      dto.startTime,
      dto.endTime,
      doctorDoc.user.timezone
    );
    if (!isSameDay) {
      throw new BadRequestError(EnumStatusCode.NOT_SAME_DAY, "Not same day");
    }

    // Make sure that the time is bold
    if (
      !PeriodUtils.isBoldTime(dto.startTime) ||
      !PeriodUtils.isBoldTime(dto.endTime)
    ) {
      throw new BadRequestError(
        EnumStatusCode.BOLD_TIME_ERROR,
        "Time is not bold"
      );
    }

    // Make sure that there is no overlap in db.
    const isExistingOverlap = await PeriodUtils.checkPeriodOverlap(
      String(doctorDoc._id),
      dto.startTime,
      dto.endTime
    );
    if (isExistingOverlap) {
      throw new BadRequestError(
        EnumStatusCode.OVERLAP_EXISTS,
        "Overlap exists"
      );
    }

    const period = new PeriodModel({
      doctor: dto.doctorId,
      startTime: dto.startTime,
      endTime: dto.endTime,
      status: PeriodStatus.Available,
      createdBy: doctorDoc.user,
    });
    await period.save();

    return new PeriodOutputDto(period);
  };

  public getPeriodsByDoctorAndTimeRange = async (
    doctorId: string,
    startTime: number,
    endTime: number
  ): Promise<PeriodOutputDto[]> => {
    // Verify the doctor exists
    const doctorDoc = (await DoctorModel.findById(doctorId)) as IDoctorDocument;
    ValidateInfo.validateDoctor(doctorDoc);

    // Query periods for the doctor within the time range (public: only available)
    const periods = await PeriodModel.find({
      doctor: doctorId,
      startTime: { $gte: startTime },
      endTime: { $lte: endTime },
      isDeleted: false,
      status: PeriodStatus.Available,
    }).sort({ startTime: 1 });

    return periods.map((p) => new PeriodOutputDto(p));
  };

  public getMyPeriodsByTimeRange = async (
    user: LoggedInUserTokenData,
    startTime: number,
    endTime: number
  ): Promise<PeriodDoctorOutputDto[]> => {
    // Find doctor by the logged-in user's id
    const doctorDoc = (await DoctorModel.findOne({
      user: user.id,
    })) as IDoctorDocument;
    ValidateInfo.validateDoctor(doctorDoc);

    console.log("data");
    console.log(String(doctorDoc._id));

    const periods = await PeriodModel.find({
      doctor: String(doctorDoc._id),
      startTime: { $gte: startTime },
      endTime: { $lte: endTime },
      isDeleted: false,
    }).sort({ startTime: 1 });

    return periods.map((p) => new PeriodDoctorOutputDto(p));
  };

  public deleteMyAvailablePeriod = async (
    user: LoggedInUserTokenData,
    periodId: string
  ): Promise<void> => {
    // Find doctor by the logged-in user's id and validate
    const doctorDoc = (await DoctorModel.findOne({
      user: user.id,
    })) as IDoctorDocument;
    ValidateInfo.validateDoctor(doctorDoc);

    // Find the period that belongs to the doctor and is still available
    const period = await PeriodModel.findOne({
      _id: periodId,
      doctor: String(doctorDoc._id),
      isDeleted: false,
      status: PeriodStatus.Available,
    });

    if (!period) {
      throw new NotFoundError(
        EnumStatusCode.NOT_FOUND,
        "Period not found or not available"
      );
    }

    // Soft delete
    period.isDeleted = true;
    period.deletedAt = Date.now();
    // @ts-ignore - model expects a user ref; we set id
    period.deletedBy = user.id as any;
    await period.save();
  };
}

// Start looking at reserving a session and the payment part.
