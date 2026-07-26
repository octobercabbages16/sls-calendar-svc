import knex, { Knex } from 'knex';
import { SecretSanta } from './SecretSanta';

interface UpdateEventReminderInput {
  method?: string;
  minutes_before?: number;
}

interface DbSecret {
  host: string;
  port: number;
  username: string;
  password: string;
  dbInstanceIdentifier: string;
}

export class EventRemindersService {
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
    const reminderId = event.pathParameters?.id;

    if (!reminderId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'reminder id is required' }),
      };
    }

    const body: UpdateEventReminderInput =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;

    const updateFields: Record<string, any> = {};

    if (body.method !== undefined) updateFields.method = body.method;
    if (body.minutes_before !== undefined) updateFields.minutes_before = body.minutes_before;

    if (Object.keys(updateFields).length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'At least one field to update is required' }),
      };
    }

    const validMethods = ['notification', 'email'];
    if (body.method && !validMethods.includes(body.method)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `method must be one of: ${validMethods.join(', ')}` }),
      };
    }

    const db = await this.getDbConnection();

    try {
      const [reminder] = await db('portal.event_reminders')
        .where({ id: reminderId })
        .update(updateFields)
        .returning('*');

      if (!reminder) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Event reminder not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminder),
      };
    } catch (error) {
      console.error('Error updating event reminder:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to update event reminder' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
