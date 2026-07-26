import knex, { Knex } from 'knex';
import { SecretSanta } from './SecretSanta';

interface UpdateCalendarShareInput {
  permission?: string;
}

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
    const shareId = event.pathParameters?.id;

    if (!shareId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'calendar share id is required' }),
      };
    }

    const body: UpdateCalendarShareInput =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;

    const updateFields: Record<string, any> = {};

    if (body.permission !== undefined) updateFields.permission = body.permission;

    if (Object.keys(updateFields).length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'At least one field to update is required' }),
      };
    }

    const validPermissions = ['read', 'write', 'admin'];
    if (body.permission && !validPermissions.includes(body.permission)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `permission must be one of: ${validPermissions.join(', ')}` }),
      };
    }

    const db = await this.getDbConnection();

    try {
      const [share] = await db('portal.calendar_shares')
        .where({ id: shareId })
        .update(updateFields)
        .returning('*');

      if (!share) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Calendar share not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(share),
      };
    } catch (error) {
      console.error('Error updating calendar share:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to update calendar share' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
