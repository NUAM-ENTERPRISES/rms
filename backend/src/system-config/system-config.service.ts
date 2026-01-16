import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * System Configuration Service
 * Manages system-wide configuration settings stored in database
 */
@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);
  private configCache: Map<string, any> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get configuration by key
   * Uses cache for better performance
   */
  async getConfig(key: string): Promise<any | null> {
    try {
      // Check cache first
      if (this.configCache.has(key)) {
        this.logger.debug(`Config cache hit for key: ${key}`);
        return this.configCache.get(key);
      }

      // Fetch from database
      const config = await this.prisma.systemConfig.findUnique({
        where: { key, isActive: true },
      });

      if (!config) {
        this.logger.warn(`Config not found for key: ${key}`);
        return null;
      }

      // Store in cache
      this.configCache.set(key, config.value);
      return config.value;
    } catch (error) {
      this.logger.error(`Failed to get config for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set/Update configuration
   */
  async setConfig(
    key: string,
    value: any,
    description?: string,
  ): Promise<void> {
    try {
      await this.prisma.systemConfig.upsert({
        where: { key },
        update: {
          value,
          description,
          updatedAt: new Date(),
        },
        create: {
          key,
          value,
          description,
          isActive: true,
        },
      });

      // Update cache
      this.configCache.set(key, value);
      this.logger.log(`Config updated for key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to set config for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache for specific key or all keys
   */
  clearCache(key?: string): void {
    if (key) {
      this.configCache.delete(key);
      this.logger.debug(`Cache cleared for key: ${key}`);
    } else {
      this.configCache.clear();
      this.logger.debug('All config cache cleared');
    }
  }

  /**
   * Get RNR (Ring Not Response) Settings
   */
  async getRNRSettings(): Promise<RNRSettings> {
    const config = await this.getConfig('RNR_SETTINGS');
    
    // Default settings if not found
    if (!config) {
      this.logger.warn('RNR_SETTINGS not found, using defaults');
      return this.getDefaultRNRSettings();
    }

    return config as RNRSettings;
  }

  /**
   * Update RNR Settings
   */
  async updateRNRSettings(settings: Partial<RNRSettings>): Promise<void> {
    const currentSettings = await this.getRNRSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    
    await this.setConfig(
      'RNR_SETTINGS',
      updatedSettings,
      'RNR reminder system configuration'
    );
  }

  /**
   * Get HRD reminder settings
   */
  async getHRDSettings(): Promise<HRDSettings> {
    const config = await this.getConfig('HRD_SETTINGS');

    if (!config) {
      this.logger.warn('HRD_SETTINGS not found, using defaults');
      return this.getDefaultHRDSettings();
    }

    return config as HRDSettings;
  }

  /**
   * Update HRD settings
   */
  async updateHRDSettings(settings: Partial<HRDSettings>): Promise<void> {
    const currentSettings = await this.getHRDSettings();
    const updatedSettings = { ...currentSettings, ...settings };

    await this.setConfig(
      'HRD_SETTINGS',
      updatedSettings,
      'HRD reminder system configuration'
    );
  }

  /**
   * Get default RNR settings
   */
  private getDefaultRNRSettings(): RNRSettings {
    return {
      totalDays: 3,
      remindersPerDay: 2,
      delayBetweenReminders: 1, // minutes (TESTING: 1 min, PROD: 240 min = 4 hours)
      officeHours: {
        enabled: true,
        start: '09:00',
        end: '18:00',
      },
      creAssignment: {
        enabled: true,
        afterDays: 3,
        assignmentStrategy: 'round_robin', // round_robin, least_loaded, manual
        creRoleId: null, // Will be set after role creation
        creTeamId: null, // Will be set after team creation
      },
    };
  }

  /**
   * Default HRD settings
   */
  private getDefaultHRDSettings(): HRDSettings {
    const dailyTimes = ['09:00'];

    return {
      daysAfterSubmission: 2, // days after submittedAt to send first reminder
      remindersPerDay: dailyTimes.length,
      dailyTimes, // Array of times (HH:mm) when reminders should be sent each day
      totalDays: 3,
      delayBetweenReminders: 60 * 24, // minutes (1 day) - fallback for repeating daily reminders
      officeHours: {
        enabled: true,
        start: '09:00',
        end: '18:00',
      },
      escalate: {
        enabled: false,
        afterDays: 3,
        assignmentStrategy: 'round_robin',
      },
      // Test mode: when enabled, HRD reminders run shortly after scheduling (useful for testing)
      testMode: {
        enabled: false,
        immediateDelayMinutes: 1,
      },
    };
  }
}

/**
 * TypeScript Interface for RNR Settings
 */
export interface RNRSettings {
  totalDays: number;
  remindersPerDay: number;
  delayBetweenReminders: number; // in minutes
  officeHours: {
     enabled?: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  creAssignment: {
    enabled: boolean;
    afterDays: number;
    assignmentStrategy: 'round_robin' | 'least_loaded' | 'manual';
    creRoleId: string | null;
    creTeamId: string | null;
  };
}

export interface HRDSettings {
  daysAfterSubmission: number; // number of days after submittedAt to send first reminder
  remindersPerDay: number; // how many reminders per day (usually equal to dailyTimes.length)
  dailyTimes: string[]; // times in HH:mm format when reminders should be sent across the day
  totalDays: number; // total number of days to continue reminders
  delayBetweenReminders: number; // in minutes (fallback)
  officeHours: {
    enabled?: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
  };
  escalate: {
    enabled: boolean;
    afterDays: number; // days after which to escalate
    assignmentStrategy: 'round_robin' | 'least_loaded' | 'manual';
  };
  testMode?: {
    enabled: boolean; // If true, reminder will be scheduled to run after immediateDelayMinutes instead of the configured dailyTimes
    immediateDelayMinutes: number; // minutes to delay in test mode
  };
} 
