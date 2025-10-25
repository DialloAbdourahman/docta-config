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
import { DoctorModel } from "docta-package";
import { NotFoundError } from "docta-package";

export class PeriodService {
  public createPeriod = async (
    dto: CreatePeriodDto,
    doctor: LoggedInUserTokenData
  ): Promise<PeriodOutputDto> => {
    // Verify the doctor exists
    const doctorDoc = (await DoctorModel.findById(
      dto.doctorId
    )) as IDoctorDocument;
    if (!doctorDoc) {
      throw new NotFoundError(EnumStatusCode.NOT_FOUND, "Doctor not found");
    }

    // Call the validate doctor here instead
    ValidateInfo.validateDoctor(doctorDoc);

    // Make sure that we have a valid time gap
    const isValidTimeGap = this.isValidTimeGap(dto.startTime, dto.endTime);
    if (!isValidTimeGap) {
      throw new BadRequestError(
        EnumStatusCode.INVALID_TIME_GAP,
        "Invalid time gap"
      );
    }

    // Make sure that the time is bold
    if (!this.isBoldTime(dto.startTime) || !this.isBoldTime(dto.endTime)) {
      throw new BadRequestError(
        EnumStatusCode.BOLD_TIME_ERROR,
        "Time is not bold"
      );
    }

    // Make sure that there is no overlap in db.
    const isExistingOverlap = await this.checkPeriodOverlap(
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
      createdBy: doctor.id,
    });
    await period.save();

    return new PeriodOutputDto(period);
  };

  private isValidTimeGap = (startTime: number, endTime: number): boolean => {
    // Ensure startTime < endTime
    if (endTime <= startTime) return false;

    // Allowed gaps in minutes
    const allowedGaps = [30, 60, 90, 120];

    // Convert milliseconds to minutes
    const diffInMinutes = (endTime - startTime) / (1000 * 60);

    // Check if difference matches any allowed gap
    return allowedGaps.includes(diffInMinutes);
  };

  private checkPeriodOverlap = async (
    doctorId: string,
    startTime: number,
    endTime: number
  ): Promise<boolean> => {
    const overlappingPeriod = await PeriodModel.findOne({
      doctor: doctorId,
      isDeleted: false,
      $or: [
        {
          // New start is inside an existing period
          startTime: { $lte: startTime },
          endTime: { $gt: startTime },
        },
        {
          // New end is inside an existing period
          startTime: { $lt: endTime },
          endTime: { $gte: endTime },
        },
        {
          // New period fully covers an existing one
          startTime: { $gte: startTime },
          endTime: { $lte: endTime },
        },
      ],
    });

    return !!overlappingPeriod;
  };

  private isBoldTime = (timestamp: number): boolean => {
    const date = new Date(timestamp);
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();

    // Must be on exact 0 or 30-minute marks, with no seconds or milliseconds
    return (
      (minutes === 0 || minutes === 30) && seconds === 0 && milliseconds === 0
    );
  };
}

// Add a route that will allow a user to search through doctors (With custome filters and pagination)
// Add a route that will list all the available periods of a doctor on a give time frame (start time and end time) of a simple user.
// Add the same above route for te doctor (display already selected times and also some additional information such as the session info in the future and the payment information maybe.)
// Add a route that will allow the doctor to delete a period if it is not occupied yet (soft delete).

// Start looking at reserving a session and the payment part.
