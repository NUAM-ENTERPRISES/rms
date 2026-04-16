/**
 * Shared date utilities - pure utility functions
 * Following FE_GUIDELINES.md shared pattern
 */

import { format, formatDistanceToNow, parseISO, isValid, differenceInMonths } from "date-fns";

export class DateUtils {
  /**
   * Format date to DD MMM YYYY as required by FE_GUIDELINES
   */
  static formatDate(dateString?: string): string {
    if (!dateString) return "N/A";

    try {
      const date =
        typeof dateString === "string" ? parseISO(dateString) : dateString;
      if (!isValid(date)) return "Invalid Date";

      return format(date, "dd MMM yyyy");
    } catch {
      return "Invalid Date";
    }
  }

  /**
   * Format date and time
   */
  static formatDateTime(dateString?: string): string {
    if (!dateString) return "N/A";

    try {
      const date =
        typeof dateString === "string" ? parseISO(dateString) : dateString;
      if (!isValid(date)) return "Invalid Date";

      return format(date, "dd MMM yyyy, HH:mm");
    } catch {
      return "Invalid Date";
    }
  }

  /**
   * Format time only
   */
  static formatTime(dateString?: string): string {
    if (!dateString) return "N/A";

    try {
      const date =
        typeof dateString === "string" ? parseISO(dateString) : dateString;
      if (!isValid(date)) return "Invalid Time";

      return format(date, "HH:mm");
    } catch {
      return "Invalid Time";
    }
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  static formatRelative(dateString?: string): string {
    if (!dateString) return "N/A";

    try {
      const date =
        typeof dateString === "string" ? parseISO(dateString) : dateString;
      if (!isValid(date)) return "Invalid Date";

      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Invalid Date";
    }
  }

  /**
   * Check if date is overdue
   */
  static isOverdue(dateString?: string): boolean {
    if (!dateString) return false;

    try {
      const date =
        typeof dateString === "string" ? parseISO(dateString) : dateString;
      if (!isValid(date)) return false;

      return date < new Date();
    } catch {
      return false;
    }
  }

  /**
   * Get days until date
   */
  static getDaysUntil(dateString?: string): number {
    if (!dateString) return 0;

    try {
      const date =
        typeof dateString === "string" ? parseISO(dateString) : dateString;
      if (!isValid(date)) return 0;

      const now = new Date();
      return Math.ceil(
        (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
    } catch {
      return 0;
    }
  }

  /**
   * Check if date is within days
   */
  static isWithinDays(dateString?: string, days: number = 7): boolean {
    if (!dateString) return false;

    const daysUntil = this.getDaysUntil(dateString);
    return daysUntil >= 0 && daysUntil <= days;
  }

  /**
   * Calculate duration between two dates
   * Returns object with years and months
   */
  static calculateDuration(
    startDate: string | Date,
    endDate?: string | Date | null,
    isCurrent: boolean = false
  ): { years: number; months: number } {
    try {
      const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
      if (!isValid(start)) return { years: 0, months: 0 };

      let end: Date;
      if (isCurrent || !endDate) {
        end = new Date();
      } else {
        end = typeof endDate === "string" ? parseISO(endDate) : endDate;
      }

      if (!isValid(end) || end < start) return { years: 0, months: 0 };

      const totalMonths = differenceInMonths(end, start);
      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;

      return { years, months };
    } catch {
      return { years: 0, months: 0 };
    }
  }

  /**
   * Format duration to string (e.g., "2 yrs 3 mos")
   */
  static formatDuration(years: number, months: number): string {
    const parts: string[] = [];

    if (years > 0) {
      parts.push(`${years} yr${years > 1 ? "s" : ""}`);
    }

    if (months > 0 || (years === 0 && months === 0)) {
      parts.push(`${months} mo${months !== 1 ? "s" : ""}`);
    }

    return parts.join(" ");
  }

  /**
   * Sum total experience from an array of work experience objects
   */
  static calculateTotalExperience(
    experiences: any[]
  ): { years: number; months: number } {
    let totalMonths = 0;

    experiences.forEach((exp) => {
      const { years, months } = this.calculateDuration(
        exp.startDate,
        exp.endDate,
        exp.isCurrent
      );
      totalMonths += years * 12 + months;
    });

    return {
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
    };
  }
}
