// Organisation interface
export interface Organisation {
  id: string;
  name: string;
  address?: string;
  size?: number;
  createdBy?: string; // UUID of the user who created this organisation
  createdAt: Date;
  updatedAt: Date;
}

// Organisation creation interface (without auto-generated fields)
export interface CreateOrganisationData {
  name: string;
  address?: string;
  size?: number;
  createdBy?: string; // UUID of the user who created this organisation
}

// Organisation update interface (all fields optional except id)
export interface UpdateOrganisationData {
  id: string;
  name?: string;
  address?: string;
  size?: number;
  createdBy?: string;
}