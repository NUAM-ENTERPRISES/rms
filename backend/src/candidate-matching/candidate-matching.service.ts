import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QualificationLevel } from '@prisma/client';
import { UnifiedEligibilityService } from '../candidate-eligibility/unified-eligibility.service';

export interface MatchedCandidate {
  candidateId: string;
  score: number;
  matchReasons: string[];
}

export interface MatchingCriteria {
  roleNeededId: string;
  projectId: string;
  excludeStatuses?: string[];
  candidateId?: string;
}

@Injectable()
export class CandidateMatchingService {
  private readonly logger = new Logger(CandidateMatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibilityService: UnifiedEligibilityService,
  ) {}

  /**
   * Find eligible candidates for a specific role with match scoring
   */
  async findEligibleCandidates(
    criteria: MatchingCriteria,
  ): Promise<MatchedCandidate[]> {
    this.logger.debug(
      `Finding eligible candidates for role ${criteria.roleNeededId}`,
    );

    // Get role requirements
    const roleNeeded = await this.prisma.roleNeeded.findUnique({
      where: { id: criteria.roleNeededId },
      include: {
        educationRequirementsList: {
          include: {
            qualification: {
              include: {
                aliases: true,
                equivalencies: {
                  include: {
                    toQualification: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!roleNeeded) {
      throw new Error(`Role needed ${criteria.roleNeededId} not found`);
    }

    // Get candidates not already nominated for this project+role
    const candidates = await this.prisma.candidate.findMany({
      where: {
        AND: [
          // If specific candidate ID is provided, only get that candidate
          ...(criteria.candidateId ? [{ id: criteria.candidateId }] : []),
          // Not already nominated for this project+role
          {
            projects: {
              none: {
                projectId: criteria.projectId,
                roleNeededId: criteria.roleNeededId,
              },
            },
          },
          // Not in late pipeline states - Allow Untouched, Interested, Qualified, Future, RNR
          {
            currentStatus: {
              statusName: {
                in: ['Untouched', 'Interested', 'Qualified', 'Future', 'RNR', 'On Hold'],
              },
            },
          },
          // Not already hired/joined in other projects
          {
            projects: {
              none: {
                currentProjectStatus: {
                  statusName: {
                    in: ['selected', 'processing', 'hired'],
                  },
                },
              },
            },
          },
        ],
      },
      include: {
        workExperiences: true,
        qualifications: {
          include: {
            qualification: {
              include: {
                aliases: true,
                equivalencies: {
                  include: {
                    toQualification: true,
                  },
                },
              },
            },
          },
        },
        currentStatus: true,
        projects: {
          include: {
            processing: true,
          },
        },
      },
    });

    this.logger.debug(
      `Found ${candidates.length} candidates to evaluate for ${roleNeeded.designation} (min exp: ${roleNeeded.minExperience}, max exp: ${roleNeeded.maxExperience})`,
    );

    // Score and filter candidates
    const matchedCandidates: MatchedCandidate[] = [];

    for (const candidate of candidates) {
      const candidateExp = candidate.totalExperience || candidate.experience || 0;
      const qualCount = candidate.qualifications?.length || 0;
      
      this.logger.debug(
        `Evaluating candidate ${candidate.firstName} ${candidate.lastName} - Experience: ${candidateExp} years, Qualifications: ${qualCount}`,
      );

      const score = await this.calculateMatchScore(candidate, roleNeeded);

      if (score > 0) {
        this.logger.debug(
          `✓ Candidate ${candidate.firstName} ${candidate.lastName} matched with score ${score}`,
        );
        matchedCandidates.push({
          candidateId: candidate.id,
          score,
          matchReasons: this.getMatchReasons(candidate, roleNeeded, score),
        });
      } else {
        this.logger.debug(
          `✗ Candidate ${candidate.firstName} ${candidate.lastName} did not match (score: ${score})`,
        );
      }
    }

    // Sort by score descending, then by createdAt ascending (tie-breaker)
    matchedCandidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return 0; // Tie-breaker would need candidate createdAt, but keeping simple for now
    });

    this.logger.log(
      `Matched ${matchedCandidates.length} candidates for role ${roleNeeded.designation}`,
    );
    return matchedCandidates;
  }

  /**
   * Calculate match score for a candidate against role requirements using unified eligibility engine
   */
  private async calculateMatchScore(
    candidate: any,
    roleNeeded: any,
  ): Promise<number> {
    try {
      const eligibilityResult = await this.eligibilityService.checkEligibility({
        candidateId: candidate.id,
        roleNeededId: roleNeeded.id,
        projectId: roleNeeded.projectId,
      });

      // Return the comprehensive score from unified eligibility engine
      return eligibilityResult.score;
    } catch (error) {
      this.logger.error(
        `Error calculating match score for candidate ${candidate.id} and role ${roleNeeded.id}:`,
        error.stack,
      );

      // Fallback to original calculation if unified service fails
      return this.legacyCalculateMatchScore(candidate, roleNeeded);
    }
  }

  /**
   * Legacy match score calculation as fallback
   */
  private async legacyCalculateMatchScore(
    candidate: any,
    roleNeeded: any,
  ): Promise<number> {
    let totalScore = 0;
    let factors = 0;

    // Education matching (40% weight)
    const educationScore = await this.matchEducation(candidate, roleNeeded);
    if (educationScore > 0) {
      totalScore += educationScore * 0.4;
      factors += 0.4;
    }

    // Experience matching (35% weight)
    const experienceScore = this.matchExperience(candidate, roleNeeded);
    if (experienceScore > 0) {
      totalScore += experienceScore * 0.35;
      factors += 0.35;
    }

    // Skills matching (25% weight)
    const skillsScore = this.matchSkills(candidate, roleNeeded);
    if (skillsScore > 0) {
      totalScore += skillsScore * 0.25;
      factors += 0.25;
    }

    return factors > 0 ? Math.round(totalScore / factors) : 0;
  }

  /**
   * Match candidate education against role requirements
   * Uses CandidateQualification junction table for proper matching
   */
  private async matchEducation(
    candidate: any,
    roleNeeded: any,
  ): Promise<number> {
    // If no education requirements, give default pass score
    if (
      !roleNeeded.educationRequirementsList ||
      roleNeeded.educationRequirementsList.length === 0
    ) {
      return 50; // Default score if no education requirements
    }

    // Use CandidateQualification data (from junction table)
    const candidateQualifications = candidate.qualifications || [];
    
    // No qualifications recorded for candidate
    if (candidateQualifications.length === 0) {
      this.logger.debug(
        `Candidate ${candidate.firstName} ${candidate.lastName} has no qualifications recorded`,
      );
      return 0; // Fail - no qualifications
    }

    let maxScore = 0;

    // Check each required qualification
    for (const req of roleNeeded.educationRequirementsList) {
      const qualification = req.qualification;
      this.logger.debug(
        `Checking requirement: ${qualification.name} (${qualification.level}, ${qualification.field})`,
      );

      // Check against each candidate qualification
      for (const candidateQual of candidateQualifications) {
        const candidateQualification = candidateQual.qualification;
        
        this.logger.debug(
          `  Comparing with candidate qual: ${candidateQualification.name}`,
        );

        // 1. Direct match by ID (100 points) - Most reliable
        if (candidateQualification.id === qualification.id) {
          maxScore = Math.max(maxScore, 100);
          this.logger.debug(`    ✓ Direct ID match (100 points)`);
          continue;
        }

        // 2. Direct name match (95 points)
        if (
          candidateQualification.name.toLowerCase() ===
            qualification.name.toLowerCase() ||
          candidateQualification.shortName?.toLowerCase() ===
            qualification.shortName?.toLowerCase()
        ) {
          maxScore = Math.max(maxScore, 95);
          this.logger.debug(`    ✓ Name match (95 points)`);
          continue;
        }

        // 3. Check aliases (90 points)
        if (qualification.aliases && Array.isArray(qualification.aliases)) {
          const aliasMatch = qualification.aliases.some(
            (alias) =>
              candidateQualification.name
                .toLowerCase()
                .includes(alias.alias.toLowerCase()) ||
              alias.alias
                .toLowerCase()
                .includes(candidateQualification.name.toLowerCase()),
          );
          if (aliasMatch) {
            maxScore = Math.max(maxScore, 90);
            this.logger.debug(`    ✓ Alias match (90 points)`);
            continue;
          }
        }

        // 4. Check equivalencies (85 points)
        if (
          qualification.equivalencies &&
          Array.isArray(qualification.equivalencies)
        ) {
          const equivMatch = qualification.equivalencies.some(
            (equiv) =>
              candidateQualification.id === equiv.toQualification.id ||
              candidateQualification.name.toLowerCase() ===
                equiv.toQualification.name.toLowerCase(),
          );
          if (equivMatch) {
            maxScore = Math.max(maxScore, 85);
            this.logger.debug(`    ✓ Equivalency match (85 points)`);
            continue;
          }
        }

        // 5. Heuristic matching for field and level (70 points)
        if (
          this.heuristicEducationMatch(
            candidateQualification.name.toLowerCase(),
            qualification,
          )
        ) {
          maxScore = Math.max(maxScore, 70);
          this.logger.debug(
            `    ✓ Heuristic match (field+level) (70 points)`,
          );
        }
      }
    }

    this.logger.debug(
      `Education match score for ${candidate.firstName} ${candidate.lastName}: ${maxScore}`,
    );
    return maxScore;
  }

  /**
   * Heuristic education matching for common patterns
   */
  private heuristicEducationMatch(
    candidateEducation: string,
    qualification: any,
  ): boolean {
    const field = qualification.field.toLowerCase();
    const level = qualification.level.toLowerCase();

    // Check if candidate education contains field and level keywords
    const hasField =
      candidateEducation.includes(field) ||
      (candidateEducation.includes('nursing') && field.includes('nursing')) ||
      (candidateEducation.includes('medical') && field.includes('medicine'));

    const hasLevel =
      candidateEducation.includes(level) ||
      (candidateEducation.includes('bsc') && level === 'bachelor') ||
      (candidateEducation.includes('msc') && level === 'master') ||
      (candidateEducation.includes('phd') && level === 'doctorate');

    return hasField && hasLevel;
  }

  /**
   * Match candidate experience against role requirements
   * STRICT: Candidate MUST meet minimum experience requirement
   */
  private matchExperience(candidate: any, roleNeeded: any): number {
    // Calculate experience from work experiences if direct fields are not available
    let candidateExp = candidate.totalExperience || candidate.experience || 0;

    // If no direct experience, calculate from work experiences
    if (
      candidateExp === 0 &&
      candidate.workExperiences &&
      candidate.workExperiences.length > 0
    ) {
      candidateExp = this.calculateExperienceFromWorkHistory(
        candidate.workExperiences,
      );
    }
    const minExp = roleNeeded.minExperience || 0;
    const maxExp = roleNeeded.maxExperience || 100;

    // STRICT: Candidate MUST have minimum experience
    if (candidateExp < minExp) {
      return 0; // Does not meet minimum requirement - FAIL
    }
    
    // Perfect match: within range
    if (candidateExp >= minExp && candidateExp <= maxExp) {
      return 100; // Perfect match
    }
    
    // Slightly over max experience
    if (candidateExp <= maxExp + 2) {
      return 90; // Slightly overqualified but acceptable
    }
    
    // Too overqualified
    if (candidateExp <= maxExp + 5) {
      return 70; // Overqualified but might be interested
    }
    
    // Way too overqualified - might not be interested
    return 40; // Significant overqualification
  }

  /**
   * Match candidate skills against role requirements
   */
  private matchSkills(candidate: any, roleNeeded: any): number {
    const candidateSkills = (candidate.skills as string[]) || [];
    const roleSkills = (roleNeeded.skills as string[]) || [];
    const technicalSkills = (roleNeeded.technicalSkills as string[]) || [];

    if (
      candidateSkills.length === 0 &&
      roleSkills.length === 0 &&
      technicalSkills.length === 0
    ) {
      return 50; // Default score if no skills specified
    }

    const allRoleSkills = [...roleSkills, ...technicalSkills];
    const matchingSkills = candidateSkills.filter((candidateSkill) =>
      allRoleSkills.some(
        (roleSkill) =>
          candidateSkill.toLowerCase().includes(roleSkill.toLowerCase()) ||
          roleSkill.toLowerCase().includes(candidateSkill.toLowerCase()),
      ),
    );

    if (allRoleSkills.length === 0) {
      return 50; // No role skills to match against
    }

    const matchPercentage = matchingSkills.length / allRoleSkills.length;
    return Math.round(matchPercentage * 100);
  }

  /**
   * Get human-readable match reasons
   */
  private getMatchReasons(
    candidate: any,
    roleNeeded: any,
    score: number,
  ): string[] {
    const reasons: string[] = [];

    if (score >= 80) {
      reasons.push('Strong match for role requirements');
    } else if (score >= 60) {
      reasons.push('Good match for role requirements');
    } else if (score >= 40) {
      reasons.push('Acceptable match for role requirements');
    } else {
      reasons.push('Basic match for role requirements');
    }

    // Add specific reasons based on matching criteria
    const candidateExp = candidate.totalExperience || candidate.experience || 0;
    const minExp = roleNeeded.minExperience || 0;
    const maxExp = roleNeeded.maxExperience || 100;

    if (candidateExp >= minExp && candidateExp <= maxExp) {
      reasons.push(`Experience matches requirement (${candidateExp} years)`);
    }

    return reasons;
  }

  /**
   * Calculate total experience from work history
   */
  private calculateExperienceFromWorkHistory(workExperiences: any[]): number {
    let totalMonths = 0;

    workExperiences.forEach((exp) => {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : new Date();

      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
      totalMonths += diffMonths;
    });

    return Math.floor(totalMonths / 12);
  }
}
