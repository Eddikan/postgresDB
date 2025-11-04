// Role name enum
export enum RoleName {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  EDITOR = 'editor',
  CONTRIBUTOR = 'contributor',
  VIEWER = 'viewer'
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