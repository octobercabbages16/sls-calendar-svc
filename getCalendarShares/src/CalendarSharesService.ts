import knex, { Knex } from 'knex';
import { SecretSanta } from './SecretSanta';

interface DbSecret {
  host: string;
  port: number;
  username: string;
  password: string;
  dbInstanceIdentifier: string;
}

export class CalendarSharesService {
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
    const calendarId = event.pathParameters?.calendar_id;

    if (!calendarId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'calendar_id is required' }),
      };
    }

    const db = await this.getDbConnection();

    try {
      const shares = await db('portal.calendar_shares')
        .where({ calendar_id: calendarId })
        .orderBy('created_at', 'asc');

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shares),
      };
    } catch (error) {
      console.error('Error getting calendar shares:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to get calendar shares' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
