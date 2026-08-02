import knex, { Knex } from 'knex';
import { SecretSanta } from './SecretSanta';

interface UpdateEventInput {
  tutor_id?: string;
  title?: string;
  description?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
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
    const body: any =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;

    const eventId = body.id;

    if (!eventId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'event id is required' }),
      };
    }

    const updateFields: Record<string, any> = {};

    if (body.tutor_id !== undefined) updateFields.tutor_id = body.tutor_id;
    if (body.title !== undefined) updateFields.title = body.title;
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.location !== undefined) updateFields.location = body.location;
    if (body.start_time !== undefined) updateFields.start_time = body.start_time;
    if (body.end_time !== undefined) updateFields.end_time = body.end_time;
    if (body.is_all_day !== undefined) updateFields.is_all_day = body.is_all_day;
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.visibility !== undefined) updateFields.visibility = body.visibility;

    if (Object.keys(updateFields).length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'At least one field to update is required' }),
      };
    }

    updateFields.updated_at = new Date().toISOString();

    const db = await this.getDbConnection();

    try {
      const [updatedEvent] = await db('portal.events')
        .where({ id: eventId })
        .update(updateFields)
        .returning('*');

      if (!updatedEvent) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Event not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent),
      };
    } catch (error) {
      console.error('Error updating event:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to update event' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
