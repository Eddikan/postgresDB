import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function projectRoutes(fastify: FastifyInstance) {
  // GET /projects - List all projects
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = `
        SELECT 
          p.id, 
          p.name, 
          p.description, 
          p."createdAt", 
          p."updatedAt"
        FROM projects p
        ORDER BY p."createdAt" DESC
      `;
      
      const result = await fastify.db.query(query);
      const projects = result.rows;

      reply.send({ projects });
    } catch (error) {
      console.error('List projects error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /projects - Create new project
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, description } = request.body as { name: string; description?: string };

    try {
      const query = `
        INSERT INTO projects (id, name, description, "createdAt", "updatedAt")
        VALUES (uuid_generate_v4(), $1, $2, NOW(), NOW())
        RETURNING *
      `;
      
      const result = await fastify.db.query(query, [name, description || null]);
      const savedProject = result.rows[0];

      reply.code(201).send({
        message: 'Project created successfully',
        project: savedProject
      });
    } catch (error) {
      console.error('Create project error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
