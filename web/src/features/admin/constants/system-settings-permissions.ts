/** Legacy umbrella still accepted for backwards compatibility. */
export const LEGACY_SYSTEM_CONFIG_READ = [
  "read:system_config",
  "manage:system_config",
] as const;

export const LEGACY_SYSTEM_CONFIG_MANAGE = ["manage:system_config"] as const;

export const RNR_SETTINGS_READ = [
  "read:rnr_settings",
  "manage:rnr_settings",
  ...LEGACY_SYSTEM_CONFIG_READ,
] as const;

export const RNR_SETTINGS_MANAGE = [
  "manage:rnr_settings",
  ...LEGACY_SYSTEM_CONFIG_MANAGE,
] as const;

export const HRD_SETTINGS_READ = [
  "read:hrd_settings",
  "manage:hrd_settings",
  ...LEGACY_SYSTEM_CONFIG_READ,
] as const;

export const HRD_SETTINGS_MANAGE = [
  "manage:hrd_settings",
  ...LEGACY_SYSTEM_CONFIG_MANAGE,
] as const;

export const LEADGEN_CHANNELS_READ = [
  "read:leadgen_channels",
  "manage:leadgen_channels",
  ...LEGACY_SYSTEM_CONFIG_READ,
] as const;

export const LEADGEN_CHANNELS_MANAGE = [
  "manage:leadgen_channels",
  ...LEGACY_SYSTEM_CONFIG_MANAGE,
] as const;

export const OFFICE_ADDRESSES_READ = [
  "read:office_addresses",
  "manage:office_addresses",
  ...LEGACY_SYSTEM_CONFIG_READ,
] as const;

export const OFFICE_ADDRESSES_MANAGE = [
  "manage:office_addresses",
  ...LEGACY_SYSTEM_CONFIG_MANAGE,
] as const;

export const MASTER_CATALOG_READ = [
  "read:master_catalog",
  "manage:master_catalog",
  ...LEGACY_SYSTEM_CONFIG_READ,
] as const;

export const MASTER_CATALOG_MANAGE = [
  "manage:master_catalog",
  ...LEGACY_SYSTEM_CONFIG_MANAGE,
] as const;

export const QUALIFICATIONS_READ = [
  "read:qualifications",
  "manage:qualifications",
] as const;

/** Any permission that unlocks the System Settings page (tabs hub). */
export const SYSTEM_SETTINGS_PAGE_ACCESS = [
  ...RNR_SETTINGS_READ,
  ...HRD_SETTINGS_READ,
  ...LEADGEN_CHANNELS_READ,
  ...OFFICE_ADDRESSES_READ,
  ...MASTER_CATALOG_READ,
  ...QUALIFICATIONS_READ,
] as const;

/** Catalog tab visible when user can see master catalog and/or qualifications. */
export const CATALOG_TAB_ACCESS = [
  ...MASTER_CATALOG_READ,
  ...QUALIFICATIONS_READ,
] as const;
