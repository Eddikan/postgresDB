import { FastifyInstance } from 'fastify';
import { FieldRole } from '../entities';

/**
 * Returns all available FieldRole values from the TypeScript enum.
 */
export async function fieldRoleRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    // Return enum values as an array of strings
    const roles = Object.values(FieldRole);
    return reply.send({ fieldRoles: roles });
  });
}

export default fieldRoleRoutes;
