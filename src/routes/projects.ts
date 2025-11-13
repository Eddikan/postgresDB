import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Country, State } from 'country-state-city';
import { CreateProjectData } from '../entities/Project';
import { authenticate, requirePermission, Permission } from '../middleware';
import { ProjectDao } from '../dataaccess/ProjectDao';
import { UserDao } from '../dataaccess';
import { DatabaseConnection } from '../datasource';
import { Logger } from '../utils/Logger';
export async function projectRoutes(fastify: FastifyInstance) {
  // Initialize DAOs
  const database = new DatabaseConnection();
  const projectDao = new ProjectDao();
  const userDao = new UserDao();

  // GET /projects - List all projects filtered by user's organisation
  fastify.get<{
    Querystring: {
      page?: number;
      limit?: number;
      search?: string;
    };
  }>('/', {
    preHandler: [authenticate]
  }, async (request: FastifyRequest<{
    Querystring: {
      page?: number;
      limit?: number;
      search?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const { page = 1, limit = 10, search } = request.query;
      const user = request.userProfile;

      Logger.info(`Getting projects for user:`, { userId: user?.id, organisationId: user?.organisationId });

      // Check if user has an organisation
      if (!user || !user.organisationId) {
        return reply.code(403).send({
          error: 'User organisation not found'
        });
      }
      
      const { projects, total } = await projectDao.getProjects({
        page: Number(page),
        limit: Number(limit),
        search,
        organisationId: user.organisationId
      });

      Logger.info(`Found ${total} projects for organisation ${user.organisationId}`);

      reply.send({ 
        projects,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      fastify.log.error('List projects error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * POST /projects - Create new project
   * Auth required: Yes
   * Permissions: PROJECT_CREATE
   */
  fastify.post<{
    Body: {
      projectName: string;
      projectCode: string;
      country: string;
      state: string;
      startDate: string;
      endDate: string;
      organisationId?: string; // Optional, will use user's org if not provided
    };
  }>('/', {
    preHandler: [authenticate, requirePermission(Permission.PROJECT_CREATE)],
    schema: {
      body: {
        type: 'object',
        required: ['projectName', 'projectCode', 'country', 'state', 'startDate', 'endDate'],
        properties: {
          projectName: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            description: 'Name of the project'
          },
          projectCode: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Unique project code identifier'
          },
          country: {
            type: 'string',
            pattern: '^[A-Z]{2}$',
            description: 'Country ISO2 code (e.g., NG for Nigeria)'
          },
          state: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'State or province name'
          },
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Project start date in ISO format (YYYY-MM-DD)'
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'Project end date in ISO format (YYYY-MM-DD)'
          },
          organisationId: {
            type: 'string',
            format: 'uuid',
            description: 'Organisation ID (optional, uses user\'s organisation if not provided)'
          }
        },
        additionalProperties: false
      },
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                projectName: { type: 'string' },
                projectCode: { type: 'string' },
                country: { type: 'string' },
                state: { type: 'string' },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                createdBy: { type: 'string' },
                createdAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { projectName, projectCode, country, state, startDate, endDate, organisationId } = request.body;
      const createdBy = request.userProfile!.id;

      // Get user's organisation if not provided
      let projectOrganisationId = organisationId;
      if (!projectOrganisationId) {
        const user = await userDao.getUserById(createdBy);
        if (!user?.organisationId) {
          return reply.code(400).send({
            error: 'User must belong to an organisation to create projects'
          });
        }
        projectOrganisationId = user.organisationId;
      }

      // Validate country ISO code
      const countryData = Country.getCountryByCode(country.toUpperCase());
      if (!countryData) {
        return reply.code(400).send({
          error: 'Invalid country ISO code. Please use a valid ISO2 country code (e.g., NG for Nigeria)'
        });
      }

      // Validate state exists in the country
      const states = State.getStatesOfCountry(country.toUpperCase());
      const stateExists = states.some(s => 
        s.name.toLowerCase() === state.toLowerCase() || 
        s.isoCode.toLowerCase() === state.toLowerCase()
      );
      
      if (!stateExists) {
        return reply.code(400).send({
          error: `Invalid state '${state}' for country '${countryData.name}'. Please provide a valid state name or ISO code.`
        });
      }

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return reply.code(400).send({
          error: 'Invalid date format. Please use ISO date format (YYYY-MM-DD)'
        });
      }

      if (end <= start) {
        return reply.code(400).send({
          error: 'End date must be after start date'
        });
      }

      // Check if project code already exists using DAO
      const projectCodeExists = await projectDao.projectCodeExists(projectCode);
      if (projectCodeExists) {
        return reply.code(409).send({
          error: 'Project code already exists. Please use a unique project code.'
        });
      }

      // Create project data
      const projectData: CreateProjectData = {
        projectName,
        projectCode,
        country: country.toUpperCase(),
        state,
        startDate: start,
        endDate: end,
        organisationId: projectOrganisationId,
        createdBy
      };

      // Create the project using DAO
      const savedProject = await projectDao.createProject(projectData);

      return reply.code(201).send({
        message: 'Project created successfully',
        data: {
          id: savedProject.id,
          projectName: savedProject.projectName,
          projectCode: savedProject.projectCode,
          country: savedProject.country,
          state: savedProject.state,
          startDate: savedProject.startDate,
          endDate: savedProject.endDate,
          createdBy: savedProject.createdBy,
          createdAt: savedProject.createdAt
        }
      });

    } catch (error: any) {
      fastify.log.error('Create project error:', error);
      
      // Handle database constraint violations
      if (error.code === '23505') { // Unique constraint violation
        return reply.code(409).send({
          error: 'Project code already exists'
        });
      }
      
      return reply.code(500).send({
        error: 'Failed to create project'
      });
    }
  });

  /**
   * GET /projects/:id - Get project by ID
   * Auth required: Yes
   */
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/:id', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params;

      const project = await projectDao.getProjectById(id);
      if (!project) {
        return reply.code(404).send({
          error: 'Project not found'
        });
      }

      return reply.send({
        project
      });

    } catch (error: any) {
      fastify.log.error('Get project error:', error);
      return reply.code(500).send({
        error: 'Failed to retrieve project'
      });
    }
  });

  /**
   * PUT /projects/:id - Update project
   * Auth required: Yes
   * Permissions: PROJECT_CREATE (for now, could add PROJECT_UPDATE later)
   */
  fastify.put<{
    Params: {
      id: string;
    };
    Body: {
      projectName?: string;
      projectCode?: string;
      country?: string;
      state?: string;
      startDate?: string;
      endDate?: string;
    };
  }>('/:id', {
    preHandler: [authenticate, requirePermission(Permission.PROJECT_CREATE)]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { projectName, projectCode, country, state, startDate, endDate } = request.body;

      // Check if project exists
      const existingProject = await projectDao.getProjectById(id);
      if (!existingProject) {
        return reply.code(404).send({
          error: 'Project not found'
        });
      }

      // Validate updates if provided
      if (country) {
        const countryData = Country.getCountryByCode(country.toUpperCase());
        if (!countryData) {
          return reply.code(400).send({
            error: 'Invalid country ISO code'
          });
        }
      }

      if (state && country) {
        const states = State.getStatesOfCountry(country.toUpperCase());
        const stateExists = states.some(s => 
          s.name.toLowerCase() === state.toLowerCase() || 
          s.isoCode.toLowerCase() === state.toLowerCase()
        );
        
        if (!stateExists) {
          return reply.code(400).send({
            error: `Invalid state for the specified country`
          });
        }
      }

      // Validate dates if provided
      let parsedStartDate, parsedEndDate;
      if (startDate) {
        parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          return reply.code(400).send({
            error: 'Invalid start date format'
          });
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
          return reply.code(400).send({
            error: 'Invalid end date format'
          });
        }
      }

      if (parsedStartDate && parsedEndDate && parsedEndDate <= parsedStartDate) {
        return reply.code(400).send({
          error: 'End date must be after start date'
        });
      }

      // Check if project code is unique (if being updated)
      if (projectCode && projectCode !== existingProject.projectCode) {
        const codeExists = await projectDao.projectCodeExists(projectCode, id);
        if (codeExists) {
          return reply.code(409).send({
            error: 'Project code already exists'
          });
        }
      }

      // Build update data
      const updateData: any = {};
      if (projectName !== undefined) updateData.projectName = projectName;
      if (projectCode !== undefined) updateData.projectCode = projectCode;
      if (country !== undefined) updateData.country = country.toUpperCase();
      if (state !== undefined) updateData.state = state;
      if (parsedStartDate) updateData.startDate = parsedStartDate;
      if (parsedEndDate) updateData.endDate = parsedEndDate;

      // Update project
      const updatedProject = await projectDao.updateProject(id, updateData);
      
      return reply.send({
        message: 'Project updated successfully',
        project: updatedProject
      });

    } catch (error: any) {
      fastify.log.error('Update project error:', error);
      return reply.code(500).send({
        error: 'Failed to update project'
      });
    }
  });

  /**
   * DELETE /projects/:id - Delete project
   * Auth required: Yes
   * Permissions: PROJECT_CREATE (for now, could add PROJECT_DELETE later)
   */
  fastify.delete<{
    Params: {
      id: string;
    };
  }>('/:id', {
    preHandler: [authenticate, requirePermission(Permission.PROJECT_CREATE)]
  }, async (request, reply) => {
    try {
      const { id } = request.params;

      // Check if project exists
      const existingProject = await projectDao.getProjectById(id);
      if (!existingProject) {
        return reply.code(404).send({
          error: 'Project not found'
        });
      }

      // Delete project
      const deleted = await projectDao.deleteProject(id);
      if (!deleted) {
        return reply.code(500).send({
          error: 'Failed to delete project'
        });
      }

      return reply.send({
        message: 'Project deleted successfully'
      });

    } catch (error: any) {
      fastify.log.error('Delete project error:', error);
      return reply.code(500).send({
        error: 'Failed to delete project'
      });
    }
  });

  /**
   * GET /projects/user/:userId - Get projects by user
   * Auth required: Yes
   */
  fastify.get<{
    Params: {
      userId: string;
    };
  }>('/user/:userId', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { userId } = request.params;

      const projects = await projectDao.getProjectsByUserId(userId);

      return reply.send({
        projects
      });

    } catch (error: any) {
      Logger.error('Get user projects error:', error);
      return reply.code(500).send({
        error: 'Failed to retrieve user projects'
      });
    }
  });

  /**
   * PATCH /projects/:id/archive - Archive a project
   * Auth required: Yes
   * Permissions: PROJECT_CREATE (for now, could add PROJECT_ARCHIVE later)
   */
  fastify.patch<{
    Params: {
      id: string;
    };
  }>('/:id/archive', {
    preHandler: [authenticate, requirePermission(Permission.PROJECT_CREATE)]
  }, async (request, reply) => {
    try {
      const { id } = request.params;

      // Check if project exists
      const existingProject = await projectDao.getProjectById(id);
      if (!existingProject) {
        return reply.code(404).send({
          error: 'Project not found'
        });
      }

      // Archive the project
      const archivedProject = await projectDao.archiveProject(id);
      if (!archivedProject) {
        return reply.code(500).send({
          error: 'Failed to archive project'
        });
      }

      return reply.send({
        message: 'Project archived successfully',
        project: archivedProject
      });

    } catch (error: any) {
      fastify.log.error('Archive project error:', error);
      return reply.code(500).send({
        error: 'Failed to archive project'
      });
    }
  });
}
