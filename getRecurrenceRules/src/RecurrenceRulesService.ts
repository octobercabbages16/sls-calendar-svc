import knex, { Knex } from 'knex';
import { SecretSanta } from './SecretSanta';

interface DbSecret {
  host: string;
  port: number;
  username: string;
  password: string;
  dbInstanceIdentifier: string;
}

export class RecurrenceRulesService {
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
    const eventId = event.pathParameters?.event_id;

    if (!eventId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'event_id is required' }),
      };
    }

    const db = await this.getDbConnection();

    try {
      const rules = await db('portal.recurrence_rules')
        .where({ event_id: eventId })
        .orderBy('frequency', 'asc');

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
      };
    } catch (error) {
      console.error('Error getting recurrence rules:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to get recurrence rules' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
