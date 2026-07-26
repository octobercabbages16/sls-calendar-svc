import knex, { Knex } from 'knex';
import { SecretSanta } from './SecretSanta';

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
    const calendarId = event.pathParameters?.calendar_id || event.queryStringParameters?.calendar_id;
    const eventId = event.pathParameters?.id || event.queryStringParameters?.id;

    // If an event ID is provided, get a single event
    if (eventId) {
      return this.getEventById(eventId);
    }

    // If a calendar ID is provided, get all events for that calendar
    if (calendarId) {
      return this.getEventsByCalendar(calendarId);
    }

    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'calendar_id or event id is required' }),
    };
  }

  private async getEventById(eventId: string) {
    const db = await this.getDbConnection();

    try {
      const eventRecord = await db('portal.events')
        .where({ id: eventId })
        .first();

      if (!eventRecord) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Event not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventRecord),
      };
    } catch (error) {
      console.error('Error getting event:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to get event' }),
      };
    } finally {
      await db.destroy();
    }
  }

  private async getEventsByCalendar(calendarId: string) {
    const db = await this.getDbConnection();

    try {
      const events = await db('portal.events')
        .where({ calendar_id: calendarId })
        .orderBy('start_time', 'asc');

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events),
      };
    } catch (error) {
      console.error('Error getting events:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to get events' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
