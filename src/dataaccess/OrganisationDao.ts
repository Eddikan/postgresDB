import { SequelizeBaseDao } from './SequelizeBaseDao';
import OrganisationModel from '../models/organisation.model';

export interface Organisation {
  id?: string;
  name: string;
  address?: string;
  size?: number;
  createdBy?: string; // UUID of the user who created this organisation
  createdAt?: Date;
  updatedAt?: Date;
}

export class OrganisationDao extends SequelizeBaseDao {
  constructor() {
    super();
  }

  async createOrganisation(organisation: Omit<Organisation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organisation> {
    const org = await OrganisationModel.create({
      name: organisation.name,
      address: organisation.address,
      size: organisation.size,
      createdBy: organisation.createdBy
    });

    return {
      id: org.id,
      name: org.name,
      address: org.address,
      size: org.size,
      createdBy: org.createdBy,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    };
  }

  async getOrganisationByName(name: string): Promise<Organisation | null> {
    const org = await OrganisationModel.findOne({ where: { name } });
    return org ? {
      id: org.id,
      name: org.name,
      address: org.address,
      size: org.size,
      createdBy: org.createdBy,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    } : null;
  }

  async getOrganisationById(id: string): Promise<Organisation | null> {
    const org = await OrganisationModel.findByPk(id);
    return org ? {
      id: org.id,
      name: org.name,
      address: org.address,
      size: org.size,
      createdBy: org.createdBy,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    } : null;
  }

  async updateOrganisation(id: string, updates: Partial<Omit<Organisation, 'id' | 'createdAt'>>): Promise<Organisation | null> {
    const [updatedCount] = await OrganisationModel.update(updates, {
      where: { id },
      returning: true
    });

    if (updatedCount === 0) {
      return null;
    }

    return this.getOrganisationById(id);
  }

  async deleteOrganisation(id: string): Promise<boolean> {
    const deletedCount = await OrganisationModel.destroy({ where: { id } });
    return deletedCount > 0;
  }

  async getAllOrganisations(): Promise<Organisation[]> {
    const orgs = await OrganisationModel.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    return orgs.map(org => ({
      id: org.id,
      name: org.name,
      address: org.address,
      size: org.size,
      createdBy: org.createdBy,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    }));
  }

  async getOrganisationUsers(organisationId: string): Promise<any[]> {
    // This will be implemented when User model has the organisation relationship
    // For now, return empty array
    return [];
  }

  async getOrganisationSuperAdmin(organisationId: string): Promise<any | null> {
    // This will be implemented when User model has the organisation relationship  
    // For now, return null
    return null;
  }
}