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