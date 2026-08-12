import knex, { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { SecretSanta } from './SecretSanta';

interface CreateEventReminderInput {
  event_id: string;
  user_id: string;
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
    const body: CreateEventReminderInput =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;

    const { event_id, user_id, method, minutes_before } = body;

    if (!event_id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'event_id is required' }),
      };
    }

    if (!user_id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'user_id is required' }),
      };
    }

    const validMethods = ['notification', 'email'];
    if (method && !validMethods.includes(method)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `method must be one of: ${validMethods.join(', ')}` }),
      };
    }

    const db = await this.getDbConnection();

    try {
      const id = uuidv4();

      const [reminder] = await db('portal.event_reminders')
        .insert({
          id,
          event_id,
          user_id,
          method: method || 'notification',
          minutes_before: minutes_before || 15,
        })
        .returning('*');

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminder),
      };
    } catch (error) {
      console.error('Error creating event reminder:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to create event reminder' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
