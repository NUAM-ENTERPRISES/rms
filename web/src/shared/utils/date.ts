/**
 * Shared date utilities - pure utility functions
 * Following FE_GUIDELINES.md shared pattern
 */

import { format, formatDistanceToNow, parseISO, isValid } from "date-fns";

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
}
