// User account status enum
export enum AccountStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

// Two-factor authentication type enum
export enum TwoFactorType {
  EMAIL = 'email',
  SMS = 'sms',
  TOTP = 'totp',
}

// Field role enum for user specialization
export enum FieldRole {
  SYSTEM_OWNER = 'System Owner',
  CTO = 'CTO',
  DIRECTOR_MINING_OPS = 'Director of Mining Ops',
  PLATFORM_OWNER = 'Platform Owner',
  INTERNAL_TECH_LEAD = 'Internal Tech Lead',
  COO = 'COO',
  OPERATIONS = 'Operations',
  TECH_SERVICES_MANAGER = 'Tech Services Manager',
  IT_LEAD = 'IT Lead',
  TECHNICAL_SERVICES_MANAGER = 'Technical Services Manager',
  IT_DATA_MANAGER = 'IT/Data Manager',
  MINE_MANAGER = 'Mine Manager',
  PROJECT_GEOLOGIST = 'Project Geologist',
  HSE_MANAGER = 'HSE Manager',
  ENVIRONMENTAL_SAFETY_MANAGER = 'Environmental & Safety Manager',
  GEOLOGISTS = 'Geologists',
  DATA_SCIENTISTS = 'Data Scientists',
  ENGINEERS = 'Engineers',
  EXPLORATION_GEOLOGIST = 'Exploration Geologist',
  DRILL_GEOLOGIST = 'Drill Geologist',
  DRILL_SUPERVISORS = 'Drill Supervisors',
  FIELD_TECHNICIANS = 'Field Technicians',
  FIELD_ASSISTANTS = 'Field Assistants',
  CEO = 'CEO',
  BD_TEAMS = 'BD Teams',
  COMMUNITY_RELATIONS_MANAGER = 'Community Relations Manager',
  EXECUTIVES = 'Executives',
  INVESTORS = 'Investors',
  DRILLER = 'driller',
  GEOLOGIST = 'geologist',
  MINER = 'miner'
}

// User interface for raw SQL operations
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  password: string;
  accountStatus: AccountStatus;
  roleId?: string;
  fieldRole?: FieldRole;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  twoFactorType?: TwoFactorType;
  twoFactorTarget?: string; // email or phone number
  twoFactorCode?: string; // hashed OTP code
  twoFactorCodeExpires?: Date;
  invitationToken?: string;
  invitationExpires?: Date;
  invitedBy?: string;
  invitedAt?: Date;
  activatedAt?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  has_changed_default_password: boolean;
  passwordChangedAt?: Date;
}

// User creation interface (without auto-generated fields)
export interface CreateUserData {
  email: string;
  firstName?: string;
  lastName?: string;
  password: string;
  accountStatus?: AccountStatus;
  roleId?: string;
  fieldRole?: FieldRole;
  twoFactorEnabled?: boolean;
  invitationToken?: string;
  invitationExpires?: Date;
  invitedBy?: string;
  invitedAt?: Date;
  has_changed_default_password?: boolean;
  passwordChangedAt?: Date;
}

// User update interface (all fields optional except id)
export interface UpdateUserData {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  accountStatus?: AccountStatus;
  roleId?: string;
  fieldRole?: FieldRole;
  twoFactorSecret?: string;
  twoFactorEnabled?: boolean;
  twoFactorType?: TwoFactorType;
  twoFactorTarget?: string;
  twoFactorCode?: string;
  twoFactorCodeExpires?: Date;
  invitationToken?: string | null;
  invitationExpires?: Date | null;
  invitedBy?: string;
  activatedAt?: Date;
  lastLogin?: Date;
  has_changed_default_password?: boolean;
  passwordChangedAt?: Date;
}