import knex, { Knex } from 'knex';
import { SecretSanta } from './SecretSanta';

interface DbSecret {
  host: string;
  port: number;
  username: string;
  password: string;
  dbInstanceIdentifier: string;
}

export class AttendeesService {
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
    const eventId = event.pathParameters?.event_id || event.queryStringParameters?.event_id;

    if (!eventId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'event_id is required' }),
      };
    }

    const db = await this.getDbConnection();

    try {
      const attendees = await db('portal.event_attendees')
        .where({ event_id: eventId })
        .orderBy('created_at', 'asc');

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendees),
      };
    } catch (error) {
      console.error('Error getting attendees:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to get attendees' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
