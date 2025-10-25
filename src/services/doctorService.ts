import { EnumStatusCode, ValidateInfo } from "docta-package";
import { NotFoundError } from "docta-package";
import { IDoctorDocument, DoctorModel } from "docta-package";
import { DoctorOutputDto, DoctorFilterDto } from "docta-package";

export class DoctorService {
  public getDoctorBySlug = async (slug: string): Promise<DoctorOutputDto> => {
    // Find doctor by slug
    const doctor: IDoctorDocument | null = (await DoctorModel.findOne({
      slug: slug,
      isDeleted: false,
    })
      .populate("user")
      .populate("specialty")) as IDoctorDocument;

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

    // Calculate pagination
    const skip = (page - 1) * itemsPerPage;

    // Find doctors with filters and pagination
    const [docs, totalItems] = await Promise.all([
      DoctorModel.find(query)
        .skip(skip)
        .limit(itemsPerPage)
        .populate("user")
        .populate("specialty"),
      DoctorModel.countDocuments(query),
    ]);

    const items = (docs as IDoctorDocument[]).map(
      (doctor) => new DoctorOutputDto(doctor)
    );

    return { items, totalItems };
  };
}
