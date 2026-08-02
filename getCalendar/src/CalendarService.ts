import knex, { Knex } from 'knex';
import { SecretSanta } from './SecretSanta';

interface DbSecret {
  host: string;
  port: number;
  username: string;
  password: string;
  dbInstanceIdentifier: string;
}

export class CalendarService {
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
    const calendarId = event.pathParameters?.id || event.queryStringParameters?.id;
    const ownerId = event.pathParameters?.owner_id || event.queryStringParameters?.owner_id;
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
      if (calendarId) conditions.id = calendarId;
      if (ownerId) conditions.owner_id = ownerId;

      const calendars = await db('portal.calendars')
        .where(conditions)
        .orderBy('created_at', 'asc');

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calendars),
      };
    } catch (error) {
      console.error('Error getting calendar:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to get calendar' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
