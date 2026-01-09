import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QueryCountriesDto } from './dto/query-countries.dto';
import { Country } from '@prisma/client';
import { CreateCountryDocumentRequirementDto, UpdateCountryDocumentRequirementDto } from './dto/country-document-requirement.dto';

export interface CountryWithStats extends Country {
  projectCount?: number;
}

export interface PaginatedCountries {
  countries: CountryWithStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class CountriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated list of countries with optional filtering
   */
  async findAll(query: QueryCountriesDto): Promise<PaginatedCountries> {
    const { search, region, isActive, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (region) {
      where.region = { contains: region, mode: 'insensitive' };
    }

    // Get total count
    const total = await this.prisma.country.count({ where });

    // Get countries with project counts
    const countries = await this.prisma.country.findMany({
      where,
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }],
      skip,
      take: limit,
    });

    // Transform to include project count
    const countriesWithStats: CountryWithStats[] = countries.map((country) => ({
      ...country,
      projectCount: country._count.projects,
    }));

    return {
      countries: countriesWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single country by code
   */
  async findOne(code: string): Promise<CountryWithStats> {
    const country = await this.prisma.country.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    if (!country) {
      throw new NotFoundException(`Country with code '${code}' not found`);
    }

    return {
      ...country,
      projectCount: country._count.projects,
    };
  }

  /**
   * Validate if a country code exists and is active
   */
  async validateCountryCode(code: string): Promise<boolean> {
    if (!code) return true; // Allow null/undefined for optional field

    const country = await this.prisma.country.findUnique({
      where: { code: code.toUpperCase() },
      select: { isActive: true },
    });

    return country?.isActive === true;
  }

  /**
   * Get all active countries for dropdowns (no pagination)
   */
  async getActiveCountries(): Promise<Country[]> {
    return this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        code: true,
        name: true,
        region: true,
        callingCode: true,
        currency: true,
        timezone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Get countries grouped by region
   */
  async getCountriesByRegion(): Promise<Record<string, Country[]>> {
    const countries = await this.getActiveCountries();

    return countries.reduce(
      (acc, country) => {
        if (!acc[country.region]) {
          acc[country.region] = [];
        }
        acc[country.region].push(country);
        return acc;
      },
      {} as Record<string, Country[]>,
    );
  }

  // === Country Document Requirements Methods ===

  /**
   * Get all document requirements for a specific country
   */
  async getDocumentRequirements(countryCode: string) {
    return this.prisma.countryDocumentRequirement.findMany({
      where: { countryCode: countryCode.toUpperCase() },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Create a new document requirement for a country
   */
  async createDocumentRequirement(dto: CreateCountryDocumentRequirementDto) {
    // Check if country exists
    const country = await this.prisma.country.findUnique({
      where: { code: dto.countryCode.toUpperCase() },
    });

    if (!country) {
      throw new NotFoundException(`Country with code ${dto.countryCode} not found`);
    }

    // Check for duplicate
    const existing = await this.prisma.countryDocumentRequirement.findUnique({
      where: {
        countryCode_docType: {
          countryCode: dto.countryCode.toUpperCase(),
          docType: dto.docType,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Document requirement "${dto.docType}" already exists for country ${dto.countryCode}`);
    }

    return this.prisma.countryDocumentRequirement.create({
      data: {
        ...dto,
        countryCode: dto.countryCode.toUpperCase(),
      },
    });
  }

  /**
   * Update an existing document requirement
   */
  async updateDocumentRequirement(id: string, dto: UpdateCountryDocumentRequirementDto) {
    const requirement = await this.prisma.countryDocumentRequirement.findUnique({
      where: { id },
    });

    if (!requirement) {
      throw new NotFoundException(`Document requirement not found`);
    }

    return this.prisma.countryDocumentRequirement.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete a document requirement
   */
  async deleteDocumentRequirement(id: string) {
    const requirement = await this.prisma.countryDocumentRequirement.findUnique({
      where: { id },
    });

    if (!requirement) {
      throw new NotFoundException(`Document requirement not found`);
    }

    return this.prisma.countryDocumentRequirement.delete({
      where: { id },
    });
  }
}
