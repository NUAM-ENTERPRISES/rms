/**
 * Project business logic - pure functions only (no I/O)
 * Following FE_GUIDELINES.md entities pattern
 */

import { Project, RoleNeeded } from "./model";

export class ProjectService {
  /**
   * Check if project is overdue
   */
  static isOverdue(project: Project): boolean {
    const deadline = new Date(project.deadline);
    const now = new Date();
    return deadline < now && project.status === "active";
  }

  /**
   * Check if project is urgent (deadline within 7 days)
   */
  static isUrgent(project: Project): boolean {
    const deadline = new Date(project.deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return (
      daysUntilDeadline <= 7 &&
      daysUntilDeadline >= 0 &&
      project.status === "active"
    );
  }

  /**
   * Calculate total positions needed
   */
  static getTotalPositions(project: Project): number {
    return project.rolesNeeded.reduce((sum, role) => sum + role.quantity, 0);
  }

  /**
   * Calculate filled positions
   */
  static getFilledPositions(project: Project): number {
    return project.candidateProjects.length;
  }

  /**
   * Calculate open positions
   */
  static getOpenPositions(project: Project): number {
    return this.getTotalPositions(project) - this.getFilledPositions(project);
  }

  /**
   * Get project status configuration
   */
  static getStatusConfig(status: string) {
    const statusMap = {
      active: {
        color: "bg-green-100 text-green-800 border-green-200",
        label: "Active",
        priority: 1,
      },
      completed: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        label: "Completed",
        priority: 3,
      },
      cancelled: {
        color: "bg-red-100 text-red-800 border-red-200",
        label: "Cancelled",
        priority: 4,
      },
    };

    return (
      statusMap[status as keyof typeof statusMap] || {
        color: "bg-gray-100 text-gray-800 border-gray-200",
        label: status,
        priority: 2,
      }
    );
  }

  /**
   * Get priority configuration
   */
  static getPriorityConfig(priority: string) {
    const priorityMap = {
      urgent: {
        color: "bg-red-100 text-red-800 border-red-200",
        label: "Urgent",
        weight: 4,
      },
      high: {
        color: "bg-orange-100 text-orange-800 border-orange-200",
        label: "High",
        weight: 3,
      },
      medium: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        label: "Medium",
        weight: 2,
      },
      low: {
        color: "bg-green-100 text-green-800 border-green-200",
        label: "Low",
        weight: 1,
      },
    };

    return (
      priorityMap[priority as keyof typeof priorityMap] || {
        color: "bg-gray-100 text-gray-800 border-gray-200",
        label: priority,
        weight: 0,
      }
    );
  }

  /**
   * Check if project can be completed
   */
  static canComplete(project: Project): boolean {
    const totalPositions = this.getTotalPositions(project);
    const filledPositions = this.getFilledPositions(project);
    return project.status === "active" && filledPositions >= totalPositions;
  }

  /**
   * Check if project can be cancelled
   */
  static canCancel(project: Project): boolean {
    return project.status === "active";
  }

  /**
   * Get role priority weight for sorting
   */
  static getRolePriorityWeight(role: RoleNeeded): number {
    const priorityWeights = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return priorityWeights[role.priority as keyof typeof priorityWeights] || 0;
  }

  /**
   * Sort roles by priority
   */
  static sortRolesByPriority(roles: RoleNeeded[]): RoleNeeded[] {
    return [...roles].sort(
      (a, b) => this.getRolePriorityWeight(b) - this.getRolePriorityWeight(a)
    );
  }
}
