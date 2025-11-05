// Project status enum
export enum ProjectStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

// Project interface for raw SQL operations
export interface Project {
  id: string;
  projectName: string;
  projectCode: string;
  country: string;
  state: string;
  startDate: Date;
  endDate: Date;
  status: ProjectStatus;
  organisationId: string;
  createdBy: string;
  drillHoles?: string[]; // Array of drill hole IDs (empty for now)
  name?: string; // Keep for backward compatibility
  description?: string; // Keep for backward compatibility
  createdAt: Date;
  updatedAt: Date;
}

// Project creation interface (without auto-generated fields)
export interface CreateProjectData {
  projectName: string;
  projectCode: string;
  country: string;
  state: string;
  startDate: Date;
  endDate: Date;
  organisationId: string;
  createdBy: string;
  status?: ProjectStatus; // Optional, defaults to PENDING
  name?: string; // Keep for backward compatibility
  description?: string; // Keep for backward compatibility
}

// Project update interface (all fields optional except id)
export interface UpdateProjectData {
  id: string;
  projectName?: string;
  projectCode?: string;
  country?: string;
  state?: string;
  startDate?: Date;
  endDate?: Date;
  status?: ProjectStatus;
  organisationId?: string;
  name?: string;
  description?: string;
}