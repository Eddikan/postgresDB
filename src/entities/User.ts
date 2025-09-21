// User status enum
export enum UserStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
}

// User interface for raw SQL operations
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  passwordHash: string;
  status: UserStatus;
  roleId?: string;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  invitationToken?: string;
  invitationExpires?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// User creation interface (without auto-generated fields)
export interface CreateUserData {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  passwordHash: string;
  status?: UserStatus;
  roleId?: string;
  twoFactorEnabled?: boolean;
}

// User update interface (all fields optional except id)
export interface UpdateUserData {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  passwordHash?: string;
  status?: UserStatus;
  roleId?: string;
  twoFactorSecret?: string;
  twoFactorEnabled?: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  invitationToken?: string | null;
  invitationExpires?: Date | null;
  lastLogin?: Date;
}