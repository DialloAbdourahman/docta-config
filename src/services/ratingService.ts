import {
  BadRequestError,
  CreateRatingDto,
  UpdateRatingDto,
  DoctorModel,
  EnumSessionStatus,
  EnumStatusCode,
  IDoctorDocument,
  IPatientDocument,
  IRatingDocument,
  ISessionDocument,
  LoggedInUserTokenData,
  NotFoundError,
  PatientModel,
  RatingModel,
  SessionModel,
} from "docta-package";
import mongoose from "mongoose";

export class RatingService {
  public createRating = async (
    sessionId: string,
    createRatingDto: CreateRatingDto,
    user: LoggedInUserTokenData
  ): Promise<IRatingDocument> => {
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

    // Get the session with populated period
    const session: ISessionDocument | null = await SessionModel.findOne({
      _id: sessionId,
      patient: patient._id,
    }).populate("period");

    if (!session) {
      throw new NotFoundError(EnumStatusCode.NOT_FOUND, "Session not found");
    }

    // Check if session status is PAID or COMPLETED
    if (
      session.status !== EnumSessionStatus.PAID &&
      session.status !== EnumSessionStatus.COMPLETED
    ) {
      throw new BadRequestError(
        EnumStatusCode.SESSION_NOT_COMPLETED,
        "Session must be paid or completed to rate"
      );
    }

    // Check if the period has passed
    if (session.period.endTime > Date.now()) {
      throw new BadRequestError(
        EnumStatusCode.PERIOD_NOT_PASSED,
        "Session period has not ended yet"
      );
    }

    // Check if rating already exists for this session
    const existingRating = await RatingModel.findOne({
      session: session._id,
      patient: patient._id,
    });

    if (existingRating) {
      throw new BadRequestError(
        EnumStatusCode.RATING_EXISTS_ALREADY,
        "You have already rated this session"
      );
    }

    // Create the rating
    const rating: IRatingDocument = new RatingModel({
      rating: createRatingDto.rating,
      message: createRatingDto.message,
      session: session._id,
      patient: patient._id,
      doctor: session.doctor,
    });

    console.log("✅ Rating created:", rating);

    // Calculate the new average rating for the doctor
    const allRatings = await RatingModel.find({
      doctor: session.doctor,
      isDeleted: false,
    });

    const totalRatings = allRatings.length + 1; // Include the new rating
    const sumOfRatings =
      allRatings.reduce((sum, r) => sum + r.rating, 0) + createRatingDto.rating;
    const averageRating = Math.round((sumOfRatings / totalRatings) * 10) / 10; // Round to 1 decimal place

    // Update the doctor's average rating
    const doctor: IDoctorDocument | null = await DoctorModel.findById(
      session.doctor
    );
    if (!doctor) {
      throw new NotFoundError(
        EnumStatusCode.DOCTOR_NOT_FOUND,
        "Doctor not found"
      );
    }

    doctor.averageRating = averageRating;

    // Save both in a transaction
    const ratingTransaction = await mongoose.startSession();
    ratingTransaction.startTransaction();

    try {
      await rating.save({ session: ratingTransaction });
      await doctor.save({ session: ratingTransaction });
      await ratingTransaction.commitTransaction();
      ratingTransaction.endSession();
    } catch (error) {
      await ratingTransaction.abortTransaction();
      ratingTransaction.endSession();
      throw error;
    }

    return rating;
  };

  public updateRating = async (
    ratingId: string,
    updateRatingDto: UpdateRatingDto,
    user: LoggedInUserTokenData
  ): Promise<IRatingDocument> => {
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

    // Get the rating
    const rating: IRatingDocument | null = await RatingModel.findOne({
      _id: ratingId,
      patient: patient._id,
      isDeleted: false,
    });

    if (!rating) {
      throw new NotFoundError(EnumStatusCode.NOT_FOUND, "Rating not found");
    }

    // Store the old rating value for recalculation
    const oldRatingValue = rating.rating;

    // Update the rating fields
    if (updateRatingDto.rating !== undefined) {
      rating.rating = updateRatingDto.rating;
    }
    if (updateRatingDto.message !== undefined) {
      rating.message = updateRatingDto.message;
    }

    console.log("✅ Rating updated:", rating);

    // Recalculate the doctor's average rating if the rating value changed
    if (
      updateRatingDto.rating !== undefined &&
      updateRatingDto.rating !== oldRatingValue
    ) {
      const allRatings = await RatingModel.find({
        doctor: rating.doctor,
        isDeleted: false,
      });

      // Calculate new average (subtract old value, add new value)
      const sumOfRatings = allRatings.reduce((sum, r) => {
        // For the current rating, use the new value
        if (r.id.toString() === rating.id.toString()) {
          return sum + updateRatingDto.rating!;
        }
        return sum + r.rating;
      }, 0);

      const totalRatings = allRatings.length;
      const averageRating = Math.round((sumOfRatings / totalRatings) * 10) / 10;

      // Update the doctor's average rating
      const doctor: IDoctorDocument | null = await DoctorModel.findById(
        rating.doctor
      );
      if (!doctor) {
        throw new NotFoundError(
          EnumStatusCode.DOCTOR_NOT_FOUND,
          "Doctor not found"
        );
      }

      doctor.averageRating = averageRating;

      // Save both in a transaction
      const ratingTransaction = await mongoose.startSession();
      ratingTransaction.startTransaction();

      try {
        await rating.save({ session: ratingTransaction });
        await doctor.save({ session: ratingTransaction });
        await ratingTransaction.commitTransaction();
        ratingTransaction.endSession();
      } catch (error) {
        await ratingTransaction.abortTransaction();
        ratingTransaction.endSession();
        throw error;
      }
    } else {
      // Only save the rating if no recalculation is needed
      await rating.save();
    }

    return rating;
  };

  public deleteRating = async (
    ratingId: string,
    user: LoggedInUserTokenData
  ): Promise<IRatingDocument> => {
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

    // Get the rating
    const rating: IRatingDocument | null = await RatingModel.findOne({
      _id: ratingId,
      patient: patient._id,
      isDeleted: false,
    });

    if (!rating) {
      throw new NotFoundError(EnumStatusCode.NOT_FOUND, "Rating not found");
    }

    // Soft delete the rating
    rating.isDeleted = true;

    console.log("✅ Rating deleted:", rating);

    // Recalculate the doctor's average rating
    const allRatings = await RatingModel.find({
      doctor: rating.doctor,
      isDeleted: false,
      _id: { $ne: rating._id }, // Exclude the deleted rating
    });

    // Update the doctor's average rating
    const doctor: IDoctorDocument | null = await DoctorModel.findById(
      rating.doctor
    );
    if (!doctor) {
      throw new NotFoundError(
        EnumStatusCode.DOCTOR_NOT_FOUND,
        "Doctor not found"
      );
    }

    // Calculate new average without the deleted rating
    if (allRatings.length > 0) {
      const sumOfRatings = allRatings.reduce((sum, r) => sum + r.rating, 0);
      const averageRating =
        Math.round((sumOfRatings / allRatings.length) * 10) / 10;
      doctor.averageRating = averageRating;
    } else {
      // No ratings left, set to 0
      doctor.averageRating = 0;
    }

    // Save both in a transaction
    const ratingTransaction = await mongoose.startSession();
    ratingTransaction.startTransaction();

    try {
      await rating.save({ session: ratingTransaction });
      await doctor.save({ session: ratingTransaction });
      await ratingTransaction.commitTransaction();
      ratingTransaction.endSession();
    } catch (error) {
      await ratingTransaction.abortTransaction();
      ratingTransaction.endSession();
      throw error;
    }

    return rating;
  };

  public getDoctorRatingsPaginated = async (
    doctorId: string,
    page: number,
    itemsPerPage: number,
    ratingValue?: number
  ): Promise<{
    ratings: IRatingDocument[];
    totalItems: number;
  }> => {
    // Verify the doctor exists
    const doctor: IDoctorDocument | null = await DoctorModel.findOne({
      _id: doctorId,
      isDeleted: false,
    });

    if (!doctor) {
      throw new NotFoundError(
        EnumStatusCode.DOCTOR_NOT_FOUND,
        "Doctor not found"
      );
    }

    // Build filter
    const filter: any = {
      doctor: doctor._id,
      isDeleted: false,
    };

    // Add rating value filter if provided
    if (ratingValue !== undefined) {
      filter.rating = ratingValue;
    }

    const skip = (page - 1) * itemsPerPage;

    const [ratings, totalItems] = await Promise.all([
      RatingModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(itemsPerPage),
      RatingModel.countDocuments(filter),
    ]);

    return { ratings, totalItems };
  };
}
