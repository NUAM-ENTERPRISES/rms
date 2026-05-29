/**
 * Shared date utilities - pure utility functions
 * Following FE_GUIDELINES.md shared pattern
 */

import {
  format,
  formatDistanceToNow,
  parseISO,
  isValid,
  intervalToDuration,
  differenceInCalendarDays,
  addDays,
} from "date-fns";

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
   * Format time only (24-hour)
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

  /** Format time in 12-hour clock with AM/PM (e.g. 3:57 PM). */
  static formatTimeAmPm(dateString?: string): string {
    if (!dateString) return "N/A";

    try {
      const date =
        typeof dateString === "string" ? parseISO(dateString) : dateString;
      if (!isValid(date)) return "Invalid Time";

      return format(date, "h:mm a");
    } catch {
      return "Invalid Time";
    }
  }

  /** Format date and time in 12-hour clock (e.g. 28 May 2026, 3:57 PM). */
  static formatDateTimeAmPm(dateString?: string): string {
    if (!dateString) return "N/A";

    try {
      const date =
        typeof dateString === "string" ? parseISO(dateString) : dateString;
      if (!isValid(date)) return "Invalid Date";

      return format(date, "dd MMM yyyy, h:mm a");
    } catch {
      return "Invalid Date";
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
   * Calculate duration between two dates (calendar-accurate years, months, days).
   */
  static calculateDuration(
    startDate: string | Date,
    endDate?: string | Date | null,
    isCurrent: boolean = false
  ): { years: number; months: number; days: number } {
    try {
      const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
      if (!isValid(start)) return { years: 0, months: 0, days: 0 };

      let end: Date;
      if (isCurrent || !endDate) {
        end = new Date();
      } else {
        end = typeof endDate === "string" ? parseISO(endDate) : endDate;
      }

      if (!isValid(end) || end < start) return { years: 0, months: 0, days: 0 };

      const duration = intervalToDuration({ start, end });
      return {
        years: duration.years ?? 0,
        months: duration.months ?? 0,
        days: duration.days ?? 0,
      };
    } catch {
      return { years: 0, months: 0, days: 0 };
    }
  }

  /**
   * Format duration to string (e.g., "2 yrs 3 mos 5 days").
   */
  static formatDuration(
    years: number,
    months: number,
    days: number = 0
  ): string {
    const parts: string[] = [];

    if (years > 0) {
      parts.push(`${years} yr${years > 1 ? "s" : ""}`);
    }

    if (months > 0 || years > 0) {
      parts.push(`${months} mo${months !== 1 ? "s" : ""}`);
    }

    parts.push(`${days} day${days !== 1 ? "s" : ""}`);

    return parts.join(" ");
  }

  /** Format a pre-aggregated month count (career-gap API); days are not available. */
  static formatDurationFromTotalMonths(totalMonths: number): string {
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    return this.formatDuration(years, months, 0);
  }

  /** Human-readable duration between two dates. */
  static formatDurationBetweenDates(
    startDate: string | Date,
    endDate?: string | Date | null,
    isCurrent: boolean = false
  ): string {
    const { years, months, days } = this.calculateDuration(
      startDate,
      endDate,
      isCurrent
    );
    return this.formatDuration(years, months, days);
  }

  /**
   * Sum total experience from work history (sums calendar days, then decomposes).
   */
  static calculateTotalExperience(
    experiences: any[]
  ): { years: number; months: number; days: number } {
    let totalDays = 0;

    experiences.forEach((exp) => {
      try {
        const start =
          typeof exp.startDate === "string"
            ? parseISO(exp.startDate)
            : exp.startDate;
        if (!isValid(start)) return;

        let end: Date;
        if (exp.isCurrent || !exp.endDate) {
          end = new Date();
        } else {
          end =
            typeof exp.endDate === "string" ? parseISO(exp.endDate) : exp.endDate;
        }

        if (!isValid(end) || end < start) return;

        totalDays += Math.max(0, differenceInCalendarDays(end, start));
      } catch {
        // skip invalid entry
      }
    });

    if (totalDays === 0) {
      return { years: 0, months: 0, days: 0 };
    }

    const duration = intervalToDuration({
      start: new Date(0),
      end: addDays(new Date(0), totalDays),
    });

    return {
      years: duration.years ?? 0,
      months: duration.months ?? 0,
      days: duration.days ?? 0,
    };
  }
}
