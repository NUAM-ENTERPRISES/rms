import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface EligibilityResult {
  isEligible: boolean;
  score: number;
  reasons: string[];
  missingRequirements: string[];
  detailedScores: {
    education: number;
    experience: number;
    skills: number;
    certifications: number;
    location: number;
  };
}

export interface MatchingCriteria {
  candidateId: string;
  roleNeededId: string;
  projectId: string;
}

@Injectable()
export class UnifiedEligibilityService {
  private readonly logger = new Logger(UnifiedEligibilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a candidate is eligible for a specific role with sophisticated matching
   */
  async checkEligibility(
    criteria: MatchingCriteria,
  ): Promise<EligibilityResult> {
    // Get candidate with all related data
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: criteria.candidateId },
      include: {
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
        workExperiences: true,
      },
    });

    if (!candidate) {
      return {
        isEligible: false,
        score: 0,
        reasons: ['Candidate not found'],
        missingRequirements: ['Candidate not found'],
        detailedScores: {
          education: 0,
          experience: 0,
          skills: 0,
          certifications: 0,
          location: 0,
        },
      };
    }

    // Get role requirements with all related data
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
      return {
        isEligible: false,
        score: 0,
        reasons: ['Role requirements not found'],
        missingRequirements: ['Role requirements not found'],
        detailedScores: {
          education: 0,
          experience: 0,
          skills: 0,
          certifications: 0,
          location: 0,
        },
      };
    }

    const result: EligibilityResult = {
      isEligible: true,
      score: 0,
      reasons: [],
      missingRequirements: [],
      detailedScores: {
        education: 0,
        experience: 0,
        skills: 0,
        certifications: 0,
        location: 0,
      },
    };

    // Check education requirements (35% weight)
    const educationCheck = await this.checkEducationEligibility(
      candidate,
      roleNeeded,
    );
    result.detailedScores.education = educationCheck.score;
    result.score += educationCheck.score * 0.35;
    result.reasons.push(...educationCheck.reasons);
    if (!educationCheck.isEligible) {
      result.isEligible = false;
      result.missingRequirements.push(...educationCheck.missingRequirements);
    }

    // Check experience requirements (30% weight)
    const experienceCheck = this.checkExperienceEligibility(
      candidate,
      roleNeeded,
    );
    result.detailedScores.experience = experienceCheck.score;
    result.score += experienceCheck.score * 0.3;
    result.reasons.push(...experienceCheck.reasons);
    if (!experienceCheck.isEligible) {
      result.isEligible = false;
      result.missingRequirements.push(...experienceCheck.missingRequirements);
    }

    // Check skills requirements (20% weight) - Liberal approach
    const skillsCheck = this.checkSkillsEligibility(candidate, roleNeeded);
    result.detailedScores.skills = skillsCheck.score;
    result.score += skillsCheck.score * 0.2;
    result.reasons.push(...skillsCheck.reasons);
    // Skills are not mandatory - don't fail eligibility based on skills alone

    // Check certifications (10% weight)
    const certificationsCheck = this.checkCertificationsEligibility(
      candidate,
      roleNeeded,
    );
    result.detailedScores.certifications = certificationsCheck.score;
    result.score += certificationsCheck.score * 0.1;
    result.reasons.push(...certificationsCheck.reasons);
    // Certifications are not mandatory

    // Check location compatibility (5% weight)
    const locationCheck = this.checkLocationEligibility(candidate, roleNeeded);
    result.detailedScores.location = locationCheck.score;
    result.score += locationCheck.score * 0.05;
    result.reasons.push(...locationCheck.reasons);
    // Location is not mandatory

    // Round final score
    result.score = Math.round(result.score);

    return result;
  }

  /**
   * Advanced education matching with aliases, equivalencies, and heuristic matching
   */
  private async checkEducationEligibility(
    candidate: any,
    roleNeeded: any,
  ): Promise<{
    isEligible: boolean;
    score: number;
    reasons: string[];
    missingRequirements: string[];
  }> {
    const result: {
      isEligible: boolean;
      score: number;
      reasons: string[];
      missingRequirements: string[];
    } = {
      isEligible: true,
      score: 0,
      reasons: [],
      missingRequirements: [],
    };

    // If no education requirements, pass with default score
    if (!roleNeeded.educationRequirementsList?.length) {
      result.score = 50;
      result.reasons.push('No specific education requirements');
      return result;
    }

    const candidateQualifications = candidate.qualifications || [];
    let bestMatch = 0;
    let matchedRequirements: string[] = [];

    for (const req of roleNeeded.educationRequirementsList) {
      const qualification = req.qualification;
      let matchScore = 0;
      let matchFound = false;

      // Check direct qualification match
      for (const candidateQual of candidateQualifications) {
        const qualName = candidateQual.qualification.name.toLowerCase();
        const qualShortName =
          candidateQual.qualification.shortName?.toLowerCase() || '';

        // 1. Direct name match (100 points)
        if (
          qualName.includes(qualification.name.toLowerCase()) ||
          qualification.name.toLowerCase().includes(qualName)
        ) {
          matchScore = 100;
          matchFound = true;
          break;
        }

        // 2. Short name match (95 points)
        if (
          qualShortName &&
          (qualShortName.includes(
            qualification.shortName?.toLowerCase() || '',
          ) ||
            (qualification.shortName &&
              qualification.shortName.toLowerCase().includes(qualShortName)))
        ) {
          matchScore = 95;
          matchFound = true;
          break;
        }

        // 3. Check aliases (90 points)
        for (const alias of qualification.aliases) {
          if (
            qualName.includes(alias.alias.toLowerCase()) ||
            alias.alias.toLowerCase().includes(qualName)
          ) {
            matchScore = 90;
            matchFound = true;
            break;
          }
        }

        if (matchFound) break;

        // 4. Check equivalencies (85 points)
        for (const equiv of qualification.equivalencies) {
          const equivName = equiv.toQualification.name.toLowerCase();
          const equivShortName =
            equiv.toQualification.shortName?.toLowerCase() || '';

          if (
            qualName.includes(equivName) ||
            equivName.includes(qualName) ||
            (equivShortName &&
              (qualName.includes(equivShortName) ||
                equivShortName.includes(qualName)))
          ) {
            matchScore = 85;
            matchFound = true;
            break;
          }
        }

        if (matchFound) break;

        // 5. Heuristic matching (70 points)
        if (this.heuristicEducationMatch(qualName, qualification)) {
          matchScore = 70;
          matchFound = true;
          break;
        }
      }

      if (matchFound) {
        bestMatch = Math.max(bestMatch, matchScore);
        matchedRequirements.push(qualification.name);
      } else {
        result.missingRequirements.push(`Required: ${qualification.name}`);
      }
    }

    result.score = bestMatch;

    if (bestMatch === 0) {
      result.isEligible = false;
      result.reasons.push('No matching education qualifications found');
    } else {
      result.reasons.push(
        `Education match: ${matchedRequirements.join(', ')} (${bestMatch}% match)`,
      );
    }

    return result;
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
      (candidateEducation.includes('medical') && field.includes('medicine')) ||
      (candidateEducation.includes('engineering') &&
        field.includes('engineering'));

    const hasLevel =
      candidateEducation.includes(level) ||
      (candidateEducation.includes('bsc') && level === 'bachelor') ||
      (candidateEducation.includes('msc') && level === 'master') ||
      (candidateEducation.includes('phd') && level === 'doctorate') ||
      (candidateEducation.includes('bachelor') && level === 'bachelor') ||
      (candidateEducation.includes('master') && level === 'master');

    return hasField && hasLevel;
  }

  /**
   * Intelligent experience matching with scoring
   */
  private checkExperienceEligibility(
    candidate: any,
    roleNeeded: any,
  ): {
    isEligible: boolean;
    score: number;
    reasons: string[];
    missingRequirements: string[];
  } {
    const result: {
      isEligible: boolean;
      score: number;
      reasons: string[];
      missingRequirements: string[];
    } = {
      isEligible: true,
      score: 0,
      reasons: [],
      missingRequirements: [],
    };

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

    if (candidateExp < minExp) {
      result.isEligible = false;
      result.missingRequirements.push(
        `Minimum ${minExp} years experience required`,
      );
      result.reasons.push(
        `Insufficient experience: ${candidateExp} years (required: ${minExp}+)`,
      );
    } else if (candidateExp > maxExp) {
      result.isEligible = false;
      result.missingRequirements.push(
        `Maximum ${maxExp} years experience allowed`,
      );
      result.reasons.push(
        `Overqualified: ${candidateExp} years (max: ${maxExp})`,
      );
    } else {
      // Calculate score based on how close to optimal range
      const optimalMin = minExp;
      const optimalMax = Math.min(maxExp, minExp + 5); // Optimal range is min to min+5 years

      if (candidateExp >= optimalMin && candidateExp <= optimalMax) {
        result.score = 100;
        result.reasons.push(`Perfect experience match: ${candidateExp} years`);
      } else if (candidateExp >= minExp && candidateExp <= maxExp) {
        result.score = 80;
        result.reasons.push(`Good experience match: ${candidateExp} years`);
      } else {
        result.score = 60;
        result.reasons.push(`Acceptable experience: ${candidateExp} years`);
      }
    }

    return result;
  }

  /**
   * Liberal skills matching - not mandatory
   */
  private checkSkillsEligibility(
    candidate: any,
    roleNeeded: any,
  ): {
    isEligible: boolean;
    score: number;
    reasons: string[];
    missingRequirements: string[];
  } {
    const result: {
      isEligible: boolean;
      score: number;
      reasons: string[];
      missingRequirements: string[];
    } = {
      isEligible: true,
      score: 0,
      reasons: [],
      missingRequirements: [],
    };

    const candidateSkills = (candidate.skills as string[]) || [];
    const roleSkills = (roleNeeded.skills as string[]) || [];
    const technicalSkills = (roleNeeded.technicalSkills as string[]) || [];

    const allRequiredSkills = [...roleSkills, ...technicalSkills];

    // If no skills required, pass with default score
    if (allRequiredSkills.length === 0) {
      result.score = 50;
      result.reasons.push('No specific skills requirements');
      return result;
    }

    const matchingSkills: string[] = [];
    const missingSkills: string[] = [];
    let totalScore = 0;

    for (const requiredSkill of allRequiredSkills) {
      let bestMatch = 0;

      for (const candidateSkill of candidateSkills) {
        const matchScore = this.calculateSkillMatch(
          candidateSkill,
          requiredSkill,
        );
        bestMatch = Math.max(bestMatch, matchScore);
      }

      if (bestMatch >= 60) {
        // Liberal threshold
        matchingSkills.push(requiredSkill);
        totalScore += bestMatch;
      } else {
        missingSkills.push(requiredSkill);
      }
    }

    result.score =
      allRequiredSkills.length > 0
        ? Math.round(totalScore / allRequiredSkills.length)
        : 50;

    if (matchingSkills.length > 0) {
      result.reasons.push(`Matching skills: ${matchingSkills.join(', ')}`);
    }

    if (missingSkills.length > 0) {
      result.reasons.push(`Missing skills: ${missingSkills.join(', ')}`);
    }

    return result;
  }

  /**
   * Calculate skill match score
   */
  private calculateSkillMatch(
    candidateSkill: string,
    requiredSkill: string,
  ): number {
    const candidate = candidateSkill.toLowerCase();
    const required = requiredSkill.toLowerCase();

    // 1. Exact match (100 points)
    if (candidate === required) {
      return 100;
    }

    // 2. Synonym match (90 points)
    if (this.isSkillSynonym(candidate, required)) {
      return 90;
    }

    // 3. Category match (80 points)
    if (candidate.includes(required) || required.includes(candidate)) {
      return 80;
    }

    // 4. Partial match (60 points)
    if (this.hasPartialSkillMatch(candidate, required)) {
      return 60;
    }

    // 5. Related match (40 points)
    if (this.isRelatedSkill(candidate, required)) {
      return 40;
    }

    return 0;
  }

  /**
   * Check if skills are synonyms
   */
  private isSkillSynonym(candidate: string, required: string): boolean {
    const synonyms: { [key: string]: string[] } = {
      javascript: ['js', 'ecmascript'],
      react: ['reactjs', 'react.js'],
      node: ['nodejs', 'node.js'],
      sql: ['mysql', 'postgresql', 'database'],
      aws: ['amazon web services', 'cloud'],
      docker: ['containerization', 'containers'],
    };

    for (const [key, values] of Object.entries(synonyms)) {
      if (
        (candidate === key && values.includes(required)) ||
        (required === key && values.includes(candidate))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for partial skill match
   */
  private hasPartialSkillMatch(candidate: string, required: string): boolean {
    const candidateWords = candidate.split(/\s+/);
    const requiredWords = required.split(/\s+/);

    return candidateWords.some((word) =>
      requiredWords.some(
        (reqWord) => word.includes(reqWord) || reqWord.includes(word),
      ),
    );
  }

  /**
   * Check if skills are related
   */
  private isRelatedSkill(candidate: string, required: string): boolean {
    const skillCategories: { [key: string]: string[] } = {
      programming: ['coding', 'development', 'software'],
      frontend: ['ui', 'ux', 'web', 'html', 'css'],
      backend: ['server', 'api', 'database'],
      medical: ['healthcare', 'clinical', 'patient'],
      nursing: ['patient care', 'healthcare', 'medical'],
    };

    for (const [category, skills] of Object.entries(skillCategories)) {
      if (
        skills.some(
          (skill) => candidate.includes(skill) || required.includes(skill),
        )
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check certifications eligibility (bonus points)
   */
  private checkCertificationsEligibility(
    candidate: any,
    roleNeeded: any,
  ): {
    isEligible: boolean;
    score: number;
    reasons: string[];
    missingRequirements: string[];
  } {
    const result: {
      isEligible: boolean;
      score: number;
      reasons: string[];
      missingRequirements: string[];
    } = {
      isEligible: true,
      score: 50, // Default score
      reasons: [],
      missingRequirements: [],
    };

    // Implementation for certifications matching
    // This can be expanded based on your certification requirements
    result.reasons.push('Certification matching not yet implemented');

    return result;
  }

  /**
   * Check location eligibility (bonus points)
   */
  private checkLocationEligibility(
    candidate: any,
    roleNeeded: any,
  ): {
    isEligible: boolean;
    score: number;
    reasons: string[];
    missingRequirements: string[];
  } {
    const result: {
      isEligible: boolean;
      score: number;
      reasons: string[];
      missingRequirements: string[];
    } = {
      isEligible: true,
      score: 50, // Default score
      reasons: [],
      missingRequirements: [],
    };

    // Implementation for location matching
    // This can be expanded based on your location requirements
    result.reasons.push('Location matching not yet implemented');

    return result;
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

  /**
   * Get detailed eligibility report for debugging
   */
  async getEligibilityReport(criteria: MatchingCriteria): Promise<{
    candidate: any;
    roleNeeded: any;
    eligibility: EligibilityResult;
    timestamp: Date;
  }> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: criteria.candidateId },
      include: {
        qualifications: {
          include: {
            qualification: true,
          },
        },
        workExperiences: true,
      },
    });

    const roleNeeded = await this.prisma.roleNeeded.findUnique({
      where: { id: criteria.roleNeededId },
      include: {
        educationRequirementsList: {
          include: {
            qualification: true,
          },
        },
      },
    });

    const eligibility = await this.checkEligibility(criteria);

    return {
      candidate,
      roleNeeded,
      eligibility,
      timestamp: new Date(),
    };
  }
}
