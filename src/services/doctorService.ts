import { ValidateInfo } from "docta-package";
import { IDoctorDocument, DoctorModel } from "docta-package";
import { DoctorOutputDto, DoctorFilterDto } from "docta-package";
import { UserModel } from "docta-package";

export class DoctorService {
  public getDoctorBySlug = async (slug: string): Promise<DoctorOutputDto> => {
    // Find doctor by slug
    const doctor: IDoctorDocument | null = (await DoctorModel.findOne({
      slug: slug,
      isDeleted: false,
    })
      .populate("user")
      .populate("specialty")
      .populate("expertises")) as IDoctorDocument;

    ValidateInfo.validateDoctor(doctor);

    return new DoctorOutputDto(doctor);
  };

  public filterDoctors = async (
    filters: DoctorFilterDto,
    page: number,
    itemsPerPage: number
  ): Promise<{
    items: DoctorOutputDto[];
    totalItems: number;
  }> => {
    // Build query with default filters
    const query: any = {
      isActive: true,
      isVisible: true,
      isDeleted: false,
    };

    // Add optional filters
    if (filters.name) {
      query.name = { $regex: filters.name, $options: "i" }; // Case-insensitive search
    }

    if (filters.specialtyId) {
      query.specialty = filters.specialtyId;
    }

    if (filters.isVerified !== undefined) {
      query.isVerified = filters.isVerified;
    }

    // Handle consultation fee range
    if (
      filters.minConsultationFee !== undefined ||
      filters.maxConsultationFee !== undefined
    ) {
      query.consultationFee = {};
      if (filters.minConsultationFee !== undefined) {
        query.consultationFee.$gte = filters.minConsultationFee;
      }
      if (filters.maxConsultationFee !== undefined) {
        query.consultationFee.$lte = filters.maxConsultationFee;
      }
    }

    // Handle expertises array
    if (filters.expertises && filters.expertises.length > 0) {
      query.expertises = { $in: filters.expertises };
    }

    // Handle email filter by querying users first
    if (filters.email) {
      const users = await UserModel.find({
        email: { $regex: filters.email, $options: "i" },
      }).select("_id");

      const userIds = users.map((u) => u._id);

      // If no users found with this email, return empty result
      if (userIds.length === 0) {
        return { items: [], totalItems: 0 };
      }

      query.user = { $in: userIds };
    }

    // Calculate pagination
    const skip = (page - 1) * itemsPerPage;

    // Find doctors with filters and pagination
    const [docs, totalItems] = await Promise.all([
      DoctorModel.find(query)
        .skip(skip)
        .limit(itemsPerPage)
        .populate("user")
        .populate("specialty")
        .populate("expertises"),
      DoctorModel.countDocuments(query),
    ]);

    const items = (docs as IDoctorDocument[]).map(
      (doctor) => new DoctorOutputDto(doctor)
    );

    return { items, totalItems };
  };
}
