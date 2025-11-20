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
        if (qualification.aliases && Array.isArray(qualification.aliases)) {
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
        }

        if (matchFound) break;

        // 4. Check equivalencies (85 points)
        if (
          qualification.equivalencies &&
          Array.isArray(qualification.equivalencies)
        ) {
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

    // STRICT: Candidate MUST meet minimum experience
    if (candidateExp < minExp) {
      result.isEligible = false;
      result.score = 0; // Hard fail
      result.missingRequirements.push(
        `Minimum ${minExp} years experience required (has ${candidateExp} years)`,
      );
      result.reasons.push(
        `Insufficient experience: ${candidateExp} years (required: ${minExp}+ years)`,
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

  /**
   * Get project with all requirements
   */
  async getProjectWithRequirements(projectId: string) {
    return await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rolesNeeded: {
          include: {
            educationRequirementsList: {
              include: {
                qualification: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get candidate with all related data
   */
  async getCandidateWithData(candidateId: string) {
    return await this.prisma.candidate.findUnique({
      where: { id: candidateId },
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
  }

  /**
   * Get detailed matchmaking analysis
   */
  async getMatchmakingAnalysis(candidate: any, project: any) {
    const analysis = {
      candidate: {
        id: candidate.id,
        name: `${candidate.firstName} ${candidate.lastName}`,
        experience: candidate.experience,
        qualifications: candidate.qualifications,
        workExperiences: candidate.workExperiences,
        skills: candidate.skills,
        certifications: candidate.certifications,
      },
      project: {
        id: project.id,
        title: project.title,
        rolesNeeded: project.rolesNeeded,
      },
      matchmakingSteps: [] as any[],
      overallScore: 0,
      isEligible: false,
    };

    // Analyze each role requirement
    for (const role of project.rolesNeeded) {
      const roleAnalysis = await this.analyzeRoleMatch(candidate, role);
      analysis.matchmakingSteps.push(roleAnalysis);

      if (roleAnalysis.isEligible) {
        analysis.isEligible = true;
        analysis.overallScore = Math.max(
          analysis.overallScore,
          roleAnalysis.score,
        );
      }
    }

    return analysis;
  }

  /**
   * Analyze match for a specific role
   */
  private async analyzeRoleMatch(candidate: any, role: any) {
    const steps: any[] = [];
    let totalScore = 0;
    let isEligible = true;

    // Education analysis
    const educationAnalysis = await this.analyzeEducationMatch(candidate, role);
    steps.push(educationAnalysis);
    totalScore += educationAnalysis.score * 0.35;
    if (!educationAnalysis.isEligible) isEligible = false;

    // Experience analysis
    const experienceAnalysis = this.analyzeExperienceMatch(candidate, role);
    steps.push(experienceAnalysis);
    totalScore += experienceAnalysis.score * 0.3;
    if (!experienceAnalysis.isEligible) isEligible = false;

    // Skills analysis
    const skillsAnalysis = this.analyzeSkillsMatch(candidate, role);
    steps.push(skillsAnalysis);
    totalScore += skillsAnalysis.score * 0.2;

    // Certifications analysis
    const certificationsAnalysis = this.analyzeCertificationsMatch(
      candidate,
      role,
    );
    steps.push(certificationsAnalysis);
    totalScore += certificationsAnalysis.score * 0.1;

    return {
      role: {
        id: role.id,
        designation: role.designation,
        minExperience: role.minExperience,
        maxExperience: role.maxExperience,
      },
      steps,
      score: totalScore,
      isEligible,
    };
  }

  private async analyzeEducationMatch(candidate: any, role: any) {
    const candidateQualifications = candidate.qualifications || [];
    const roleRequirements = role.educationRequirementsList || [];

    if (roleRequirements.length === 0) {
      return {
        category: 'Education',
        score: 50,
        isEligible: true,
        details: 'No specific education requirements',
        requirements: [],
        candidateQualifications: candidateQualifications,
      };
    }

    let maxScore = 0;
    let matchedRequirements: string[] = [];
    let missingRequirements: string[] = [];

    for (const req of roleRequirements) {
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
        if (qualification.aliases && Array.isArray(qualification.aliases)) {
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
        }

        if (matchFound) break;

        // 4. Check equivalencies (85 points)
        if (
          qualification.equivalencies &&
          Array.isArray(qualification.equivalencies)
        ) {
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
        maxScore = Math.max(maxScore, matchScore);
        matchedRequirements.push(qualification.name);
      } else {
        missingRequirements.push(qualification.name);
      }
    }

    const isEligible = maxScore >= 70; // Threshold for eligibility
    const details = isEligible
      ? `Education match: ${matchedRequirements.join(', ')} (${maxScore}% match)`
      : `Missing education requirements: ${missingRequirements.join(', ')}`;

    return {
      category: 'Education',
      score: maxScore,
      isEligible,
      details,
      requirements: roleRequirements,
      candidateQualifications: candidateQualifications,
    };
  }

  private analyzeExperienceMatch(candidate: any, role: any) {
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

    const minExp = role.minExperience || 0;
    const maxExp = role.maxExperience || 100;

    let score = 0;
    let isEligible = true;
    let details = '';

    if (candidateExp < minExp) {
      isEligible = false;
      score = Math.max(0, 100 - Math.abs(candidateExp - minExp) * 10);
      details = `Insufficient experience: ${candidateExp} years (required: ${minExp}+)`;
    } else if (candidateExp > maxExp) {
      isEligible = false;
      score = Math.max(0, 100 - Math.abs(candidateExp - maxExp) * 5);
      details = `Overqualified: ${candidateExp} years (max: ${maxExp})`;
    } else {
      // Calculate score based on how close to optimal range
      const optimalMin = minExp;
      const optimalMax = Math.min(maxExp, minExp + 5); // Optimal range is min to min+5 years

      if (candidateExp >= optimalMin && candidateExp <= optimalMax) {
        score = 100;
        details = `Perfect experience match: ${candidateExp} years`;
      } else if (candidateExp >= minExp && candidateExp <= maxExp) {
        score = 80;
        details = `Good experience match: ${candidateExp} years`;
      } else {
        score = 60;
        details = `Acceptable experience: ${candidateExp} years`;
      }
    }

    return {
      category: 'Experience',
      score,
      isEligible,
      details,
      candidateExperience: candidateExp,
      requiredExperience: { min: minExp, max: maxExp },
    };
  }

  private analyzeSkillsMatch(candidate: any, role: any) {
    const candidateSkills = (candidate.skills as string[]) || [];
    const roleSkills = (role.skills as string[]) || [];
    const technicalSkills = (role.technicalSkills as string[]) || [];

    const allRequiredSkills = [...roleSkills, ...technicalSkills];

    // If no skills required, pass with default score
    if (allRequiredSkills.length === 0) {
      return {
        category: 'Skills',
        score: 50,
        isEligible: true,
        details: 'No specific skills requirements',
        candidateSkills: candidateSkills,
        requiredSkills: [],
      };
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

    const score =
      allRequiredSkills.length > 0
        ? Math.round(totalScore / allRequiredSkills.length)
        : 50;

    const isEligible = true; // Skills are not mandatory
    const details =
      matchingSkills.length > 0
        ? `Matching skills: ${matchingSkills.join(', ')}`
        : `Missing skills: ${missingSkills.join(', ')}`;

    return {
      category: 'Skills',
      score,
      isEligible,
      details,
      candidateSkills: candidateSkills,
      requiredSkills: allRequiredSkills,
    };
  }

  private analyzeCertificationsMatch(candidate: any, role: any) {
    const candidateCertifications = candidate.certifications || [];
    const requiredCertifications = role.certifications || [];

    // If no certifications required, pass with default score
    if (requiredCertifications.length === 0) {
      return {
        category: 'Certifications',
        score: 50,
        isEligible: true,
        details: 'No specific certification requirements',
        candidateCertifications: candidateCertifications,
        requiredCertifications: [],
      };
    }

    const matchingCertifications: string[] = [];
    const missingCertifications: string[] = [];
    let totalScore = 0;

    for (const requiredCert of requiredCertifications) {
      let bestMatch = 0;

      for (const candidateCert of candidateCertifications) {
        const matchScore = this.calculateSkillMatch(
          candidateCert,
          requiredCert,
        );
        bestMatch = Math.max(bestMatch, matchScore);
      }

      if (bestMatch >= 60) {
        matchingCertifications.push(requiredCert);
        totalScore += bestMatch;
      } else {
        missingCertifications.push(requiredCert);
      }
    }

    const score =
      requiredCertifications.length > 0
        ? Math.round(totalScore / requiredCertifications.length)
        : 50;

    const isEligible = true; // Certifications are not mandatory
    const details =
      matchingCertifications.length > 0
        ? `Matching certifications: ${matchingCertifications.join(', ')}`
        : `Missing certifications: ${missingCertifications.join(', ')}`;

    return {
      category: 'Certifications',
      score,
      isEligible,
      details,
      candidateCertifications: candidateCertifications,
      requiredCertifications: requiredCertifications,
    };
  }
}
