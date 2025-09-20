// Role name enum
export enum RoleName {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  GEOLOGIST = 'geologist',
  DRILLER = 'driller',
  JUNIOR_DRILLER = 'junior_driller',
  USER = 'user'
}

// Permission enum
export enum Permission {
  // User management
  CREATE_USER = 'CREATE_USER',
  READ_USER = 'READ_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  INVITE_USER = 'INVITE_USER',
  
  // Project management
  CREATE_PROJECT = 'CREATE_PROJECT',
  READ_PROJECT = 'READ_PROJECT',
  UPDATE_PROJECT = 'UPDATE_PROJECT',
  DELETE_PROJECT = 'DELETE_PROJECT',
  
  // Drilling management
  CREATE_DRILLING = 'CREATE_DRILLING',
  READ_DRILLING = 'READ_DRILLING',
  UPDATE_DRILLING = 'UPDATE_DRILLING',
  DELETE_DRILLING = 'DELETE_DRILLING',
  
  // Data management
  ADD_DATASET = 'ADD_DATASET',
  ADD_ENTRY = 'ADD_ENTRY',
  EDIT_DATASET = 'EDIT_DATASET',
  DELETE_DATASET = 'DELETE_DATASET',
  
  // System administration
  MANAGE_ROLES = 'MANAGE_ROLES',
  SYSTEM_SETTINGS = 'SYSTEM_SETTINGS'
}

// Role interface for raw SQL operations
export interface Role {
  id: string;
  name: RoleName;
  description?: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

// Role creation interface
export interface CreateRoleData {
  name: RoleName;
  description?: string;
  permissions: Permission[];
}

// Role update interface
export interface UpdateRoleData {
  id: string;
  name?: RoleName;
  description?: string;
  permissions?: Permission[];
}