/**
 * Candidate business logic - pure functions only (no I/O)
 * Following FE_GUIDELINES.md entities pattern
 */

import { Candidate, CandidateProjectMap } from "./model";
import { CandidateProjectStatus } from "@/constants/statuses";

export class CandidateService {
  /**
   * Check if candidate can be nominated for a project
   */
  static canNominate(candidate: Candidate): boolean {
    return candidate.currentStatus === "active";
  }

  /**
   * Check if candidate can be approved
   */
  static canApprove(candidateProject: CandidateProjectMap): boolean {
    const approvalStatuses: CandidateProjectStatus[] = [
      "documents_verified",
      "interview_passed",
    ];
    return approvalStatuses.includes(
      candidateProject.status as CandidateProjectStatus
    );
  }

  /**
   * Calculate candidate experience level
   */
  static getExperienceLevel(experience?: number): string {
    if (!experience) return "Entry Level";
    if (experience < 2) return "Entry Level";
    if (experience < 5) return "Mid Level";
    if (experience < 10) return "Senior Level";
    return "Expert Level";
  }

  /**
   * Check if candidate has required skills
   */
  static hasRequiredSkills(
    candidate: Candidate,
    requiredSkills: string[]
  ): boolean {
    if (!requiredSkills.length) return true;

    const candidateSkills = candidate.skills.map((skill) =>
      skill.toLowerCase()
    );
    return requiredSkills.some((skill) =>
      candidateSkills.includes(skill.toLowerCase())
    );
  }

  /**
   * Calculate match score between candidate and project requirements
   */
  static calculateMatchScore(
    candidate: Candidate,
    requirements: {
      minExperience?: number;
      maxExperience?: number;
      skills?: string[];
    }
  ): number {
    let score = 0;
    let factors = 0;

    // Experience matching
    if (
      requirements.minExperience !== undefined ||
      requirements.maxExperience !== undefined
    ) {
      factors++;
      const exp = candidate.experience || 0;
      const min = requirements.minExperience || 0;
      const max = requirements.maxExperience || 100;

      if (exp >= min && exp <= max) {
        score += 40; // Perfect experience match
      } else if (exp >= min - 1 && exp <= max + 1) {
        score += 30; // Close experience match
      } else {
        score += 10; // Experience mismatch
      }
    }

    // Skills matching
    if (requirements.skills?.length) {
      factors++;
      const matchingSkills = requirements.skills.filter((skill) =>
        candidate.skills.some((candidateSkill) =>
          candidateSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );

      const skillMatchPercentage =
        matchingSkills.length / requirements.skills.length;
      score += skillMatchPercentage * 60; // Up to 60 points for skills
    }

    return factors > 0 ? Math.round(score / factors) : 50; // Default 50% if no criteria
  }

  /**
   * Get candidate status display info
   */
  static getStatusInfo(status: string) {
    const statusMap = {
      active: { label: "Active", color: "emerald", priority: 1 },
      interviewing: { label: "Interviewing", color: "blue", priority: 2 },
      placed: { label: "Placed", color: "purple", priority: 3 },
      rejected: { label: "Rejected", color: "red", priority: 4 },
      inactive: { label: "Inactive", color: "gray", priority: 5 },
    };

    return (
      statusMap[status as keyof typeof statusMap] || {
        label: status,
        color: "gray",
        priority: 6,
      }
    );
  }
}
