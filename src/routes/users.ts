import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function userRoutes(fastify: FastifyInstance) {
  // Simple placeholder for users - auth system needs to be rewritten for raw SQL
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: 'Users route - auth system needs SQL rewrite' });
  });
}
