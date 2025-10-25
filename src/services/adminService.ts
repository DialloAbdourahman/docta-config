import { ISpecialtyDocument, SpecialtyModel } from "docta-package";

import { EnumStatusCode } from "docta-package";
import { NotFoundError } from "docta-package";
import { LoggedInUserTokenData } from "docta-package";
import { CreateSpecialtyDto, UpdateSpecialtyDto } from "docta-package";
import { SpecialtyAdminOutputDto, SpecialtyOutputDto } from "docta-package";

export class AdminService {
  public createSpecialty = async (
    dto: CreateSpecialtyDto,
    admin: LoggedInUserTokenData
  ): Promise<SpecialtyOutputDto> => {
    const specialty = new SpecialtyModel({
      en: dto.en,
      fr: dto.fr ?? null,
      createdBy: admin.id,
    });
    await specialty.save();
    return new SpecialtyOutputDto(specialty as ISpecialtyDocument);
  };

  public updateSpecialty = async (
    id: string,
    dto: UpdateSpecialtyDto,
    admin: LoggedInUserTokenData
  ): Promise<SpecialtyOutputDto> => {
    const specialty = (await SpecialtyModel.findById(
      id
    )) as ISpecialtyDocument | null;
    if (!specialty) {
      throw new NotFoundError(
        EnumStatusCode.SPECIALTY_NOT_FOUND,
        "Specialty not found"
      );
    }

    // Update localized fields if provided
    if (dto.en) {
      specialty.en.name = dto.en.name ?? specialty.en.name;
      specialty.en.description = dto.en.description ?? specialty.en.description;
    }
    if (dto.fr) {
      if (!specialty.fr) specialty.fr = { name: "", description: null } as any;
      specialty.fr!.name = dto.fr.name ?? specialty.fr!.name;
      specialty.fr!.description =
        dto.fr.description ?? specialty.fr!.description;
    }

    specialty.updatedBy = admin.id as any;
    await specialty.save();
    return new SpecialtyOutputDto(specialty);
  };

  public deleteSpecialty = async (
    id: string,
    admin: LoggedInUserTokenData
  ): Promise<void> => {
    const specialty = (await SpecialtyModel.findById(
      id
    )) as ISpecialtyDocument | null;
    if (!specialty) {
      throw new NotFoundError(
        EnumStatusCode.SPECIALTY_NOT_FOUND,
        "Specialty not found"
      );
    }
    specialty.isDeleted = true;
    specialty.deletedAt = Date.now();
    specialty.deletedBy = admin.id as any;
    await specialty.save();
  };

  public listSpecialties = async (
    page: number,
    itemsPerPage: number
  ): Promise<{
    items: SpecialtyAdminOutputDto[];
    totalItems: number;
  }> => {
    const filter = { isDeleted: false };
    const skip = (page - 1) * itemsPerPage;
    const [docs, totalItems] = await Promise.all([
      SpecialtyModel.find(filter)
        .skip(skip)
        .limit(itemsPerPage)
        .populate("createdBy")
        .populate("updatedBy")
        .populate("deletedBy"),
      SpecialtyModel.countDocuments(filter),
    ]);
    const items = (docs as ISpecialtyDocument[]).map(
      (s) => new SpecialtyAdminOutputDto(s)
    );
    return { items, totalItems };
  };
}
