import knex, { Knex } from 'knex';
import { SecretSanta } from './SecretSanta';

interface DbSecret {
  host: string;
  port: number;
  username: string;
  password: string;
  dbInstanceIdentifier: string;
}

export class EventService {
  private async getDbConnection(): Promise<Knex> {
    const secretSanta = new SecretSanta();
    const secretResponse = await secretSanta.getSecret();
    const jsonSecret: DbSecret = JSON.parse(secretResponse.SecretString);

    return knex({
      client: 'pg',
      connection: {
        host: jsonSecret.host,
        port: jsonSecret.port,
        user: jsonSecret.username,
        password: jsonSecret.password,
        database: jsonSecret.dbInstanceIdentifier,
      },
    });
  }

  async processRequest(event: any) {
    const eventId = event.pathParameters?.id || event.queryStringParameters?.id;
    const calendarId = event.pathParameters?.calendar_id || event.queryStringParameters?.calendar_id;
    const tutorId = event.pathParameters?.tutor_id || event.queryStringParameters?.tutor_id;
    const tenantId = event.pathParameters?.tenant_id || event.queryStringParameters?.tenant_id;

    if (!tenantId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'tenant_id is required' }),
      };
    }

    const db = await this.getDbConnection();

    try {
      const conditions: Record<string, any> = {};
      conditions.tenant_id = tenantId;
      if (eventId) conditions.id = eventId;
      if (calendarId) conditions.calendar_id = calendarId;
      if (tutorId) conditions.tutor_id = tutorId;

      const query = db('portal.events_view')
        .where(conditions)
        .orderBy('start_time', 'asc');

      console.log('Query:', query.toString());

      const events = await query;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events),
      };
    } catch (error) {
      console.error('Error getting events:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to get events' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
