import knex, { Knex } from 'knex';
import { SecretSanta } from './SecretSanta';

interface CreateEventInput {
  calendar_id: string;
  tutor_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  is_all_day?: boolean;
  status?: string;
  visibility?: string;
}

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
    const body: CreateEventInput =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;

    const { calendar_id, tutor_id, tenant_id, title, description, location, start_time, end_time, is_all_day, status, visibility } = body;

    if (!calendar_id) {
      return { error: 'calendar_id is required' };
    }

    if (!title) {
      return { error: 'title is required' };
    }

    if (!start_time || !end_time) {
      return { error: 'start_time and end_time are required' };
    }

    const db = await this.getDbConnection();

    try {
      const now = new Date().toISOString();

      const [createdEvent] = await db('portal.events')
        .insert({
          calendar_id,
          tutor_id,
          tenant_id,
          title,
          description: description || null,
          location: location || null,
          start_time,
          end_time,
          is_all_day: is_all_day || false,
          status: status || 'confirmed',
          visibility: visibility || 'default',
          created_at: now,
          updated_at: now,
        })
        .returning('*');

      return JSON.stringify(createdEvent);
    } catch (error) {
      console.error('Error creating event:', error);

      return { error: 'Failed to create event' };
    } finally {
      await db.destroy();
    }
  }
}
