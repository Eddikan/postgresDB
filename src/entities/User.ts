// User account status enum
export enum AccountStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

// User interface for raw SQL operations
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  passwordHash: string;
  accountStatus: AccountStatus;
  roleId?: string;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  invitationToken?: string;
  invitationExpires?: Date;
  invitedBy?: string;
  invitedAt?: Date;
  activatedAt?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// User creation interface (without auto-generated fields)
export interface CreateUserData {
  email: string;
  firstName?: string;
  lastName?: string;
  passwordHash: string;
  accountStatus?: AccountStatus;
  roleId?: string;
  twoFactorEnabled?: boolean;
  invitationToken?: string;
  invitationExpires?: Date;
  invitedBy?: string;
}

// User update interface (all fields optional except id)
export interface UpdateUserData {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  passwordHash?: string;
  accountStatus?: AccountStatus;
  roleId?: string;
  twoFactorSecret?: string;
  twoFactorEnabled?: boolean;
  invitationToken?: string | null;
  invitationExpires?: Date | null;
  invitedBy?: string;
  activatedAt?: Date;
  lastLogin?: Date;
}