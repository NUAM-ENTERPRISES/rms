/**
 * Shared formatting utilities - pure utility functions
 * Following FE_GUIDELINES.md shared pattern
 */

export class FormatUtils {
  /**
   * Format currency values
   */
  static formatCurrency(amount?: number, currency: string = "USD"): string {
    if (amount === undefined || amount === null) return "N/A";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format numbers with commas
   */
  static formatNumber(num?: number): string {
    if (num === undefined || num === null) return "N/A";

    return new Intl.NumberFormat("en-US").format(num);
  }

  /**
   * Format percentage
   */
  static formatPercentage(value?: number, decimals: number = 1): string {
    if (value === undefined || value === null) return "N/A";

    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format phone number
   */
  static formatPhone(phone?: string): string {
    if (!phone) return "N/A";

    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, "");

    // Format as (XXX) XXX-XXXX for US numbers
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
        6
      )}`;
    }

    // Return original if not standard format
    return phone;
  }

  /**
   * Truncate text with ellipsis
   */
  static truncate(text?: string, maxLength: number = 50): string {
    if (!text) return "";

    if (text.length <= maxLength) return text;

    return `${text.slice(0, maxLength)}...`;
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes?: number): string {
    if (!bytes || bytes === 0) return "0 B";

    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Format initials from name
   */
  static getInitials(name?: string): string {
    if (!name) return "?";

    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Format skills array as comma-separated string
   */
  static formatSkills(skills?: string[], maxDisplay: number = 3): string {
    if (!skills || skills.length === 0) return "No skills listed";

    if (skills.length <= maxDisplay) {
      return skills.join(", ");
    }

    const displayed = skills.slice(0, maxDisplay).join(", ");
    const remaining = skills.length - maxDisplay;

    return `${displayed} +${remaining} more`;
  }

  /**
   * Capitalize first letter
   */
  static capitalize(text?: string): string {
    if (!text) return "";

    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Convert camelCase to Title Case
   */
  static camelToTitle(text?: string): string {
    if (!text) return "";

    return text
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }
}
