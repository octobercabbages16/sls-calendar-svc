import knex, { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { SecretSanta } from './SecretSanta';

interface CreateCalendarShareInput {
  calendar_id: string;
  shared_with_user_id: string;
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
    const body: CreateCalendarShareInput =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;

    const { calendar_id, shared_with_user_id, permission } = body;

    if (!calendar_id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'calendar_id is required' }),
      };
    }

    if (!shared_with_user_id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'shared_with_user_id is required' }),
      };
    }

    const validPermissions = ['read', 'write', 'admin'];
    if (permission && !validPermissions.includes(permission)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `permission must be one of: ${validPermissions.join(', ')}` }),
      };
    }

    const db = await this.getDbConnection();

    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const [share] = await db('portal.calendar_shares')
        .insert({
          id,
          calendar_id,
          shared_with_user_id,
          permission: permission || 'read',
          created_at: now,
        })
        .returning('*');

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(share),
      };
    } catch (error) {
      console.error('Error creating calendar share:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to create calendar share' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
