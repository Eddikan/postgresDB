import { FastifyInstance } from 'fastify';
import { EmailService } from '../services/email.service';

export default async function testEmailRoute(server: FastifyInstance) {
  server.post('/test-email', async (request, reply) => {
    try {
      const success = await EmailService.sendSampleEmailToSuperAdmin();
      if (success) {
        reply.send({ status: 'ok', message: 'Test email sent to super admin.' });
      } else {
        reply.status(500).send({ status: 'error', message: 'Failed to send test email.' });
      }
    } catch (err:any) {
      reply.status(500).send({ status: 'error', message: err.message });
    }
  });
}
