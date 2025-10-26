import { PeriodModel } from "docta-package";
import { config } from "../config";
import { toZonedTime } from "date-fns-tz";

export class PeriodUtils {
  public static isValidTimeGap = (
    startTime: number,
    endTime: number
  ): boolean => {
    // Ensure startTime < endTime
    if (endTime <= startTime) return false;

    // Allowed gaps in minutes
    const allowedGaps = [30, 60, 90, 120];

    // Convert milliseconds to minutes
    const diffInMinutes = (endTime - startTime) / (1000 * 60);

    // Check if difference matches any allowed gap
    return allowedGaps.includes(diffInMinutes);
  };

  public static checkPeriodOverlap = async (
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

  public static isBoldTime = (timestamp: number): boolean => {
    const date = new Date(timestamp);
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();

    // Must be on exact 0 or 30-minute marks, with no seconds or milliseconds
    return (
      (minutes === 0 || minutes === 30) && seconds === 0 && milliseconds === 0
    );
  };

  public static isSameDayInZone = (
    startTime: number,
    endTime: number,
    timeZone: string
  ): boolean => {
    const start = toZonedTime(startTime, timeZone);
    const end = toZonedTime(endTime, timeZone);

    return (
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate()
    );
  };
}
