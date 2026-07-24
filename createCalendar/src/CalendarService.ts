import knex, { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { SecretSanta } from './SecretSanta';

interface CreateCalendarInput {
  owner_id: string;
  name: string;
  description?: string;
  color?: string;
  is_default?: boolean;
}

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
    const body: CreateCalendarInput =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;

    const { owner_id, name, description, color, is_default } = body;

    if (!owner_id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'owner_id is required' }),
      };
    }

    if (!name) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'name is required' }),
      };
    }

    const db = await this.getDbConnection();

    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const [calendar] = await db('portal.calendars')
        .insert({
          id,
          owner_id,
          name,
          description: description || null,
          color: color || null,
          is_default: is_default || false,
          created_at: now,
          updated_at: now,
        })
        .returning('*');

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calendar),
      };
    } catch (error) {
      console.error('Error creating calendar:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to create calendar' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
