// Drilling interface for raw SQL operations
export interface Drilling {
  id: string;
  name: string;
  description?: string;
  dataSet?: any; // JSON data structure
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Drilling creation interface (without auto-generated fields)
export interface CreateDrillingData {
  name: string;
  description?: string;
  dataSet?: any;
  projectId: string;
}

// Drilling update interface (all fields optional except id)
export interface UpdateDrillingData {
  id: string;
  name?: string;
  description?: string;
  dataSet?: any;
  projectId?: string;
}