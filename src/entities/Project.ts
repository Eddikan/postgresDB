// Project interface for raw SQL operations
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Project creation interface (without auto-generated fields)
export interface CreateProjectData {
  name: string;
  description?: string;
}

// Project update interface (all fields optional except id)
export interface UpdateProjectData {
  id: string;
  name?: string;
  description?: string;
}