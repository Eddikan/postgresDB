import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function drillingRoutes(fastify: FastifyInstance) {
  // GET /drillings - List all drillings
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = `
        SELECT 
          d.id, 
          d.name, 
          d.description, 
          d."projectId",
          d."dataSet",
          d."createdAt", 
          d."updatedAt"
        FROM drillings d
        ORDER BY d."createdAt" DESC
      `;
      
      const result = await fastify.db.query(query);
      const drillings = result.rows;

      reply.send({ drillings });
    } catch (error) {
      console.error('List drillings error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /drillings - Create new drilling
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, description, projectId, dataSet } = request.body as { 
      name: string; 
      description?: string; 
      projectId: string; 
      dataSet?: any 
    };

    try {
      // Verify project exists
      const projectCheckQuery = 'SELECT id FROM projects WHERE id = $1';
      const projectResult = await fastify.db.query(projectCheckQuery, [projectId]);
      
      if (projectResult.rows.length === 0) {
        return reply.code(400).send({ error: 'Invalid project ID' });
      }

      const insertQuery = `
        INSERT INTO drillings (id, name, description, "projectId", "dataSet", "createdAt", "updatedAt")
        VALUES (uuid_generate_v4(), $1, $2, $3, $4, NOW(), NOW())
        RETURNING *
      `;
      
      const result = await fastify.db.query(insertQuery, [name, description || null, projectId, JSON.stringify(dataSet || [])]);
      const savedDrilling = result.rows[0];

      reply.code(201).send({
        message: 'Drilling created successfully',
        drilling: savedDrilling
      });
    } catch (error) {
      console.error('Create drilling error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
