import knex, { Knex } from 'knex';
import { SecretSanta } from './SecretSanta';

interface UpdateCalendarInput {
  name?: string;
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
    const calendarId = event.pathParameters?.id;

    if (!calendarId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'calendar id is required' }),
      };
    }

    const body: UpdateCalendarInput =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;

    const updateFields: Record<string, any> = {};

    if (body.name !== undefined) updateFields.name = body.name;
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.color !== undefined) updateFields.color = body.color;
    if (body.is_default !== undefined) updateFields.is_default = body.is_default;

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
      const [calendar] = await db('portal.calendars')
        .where({ id: calendarId })
        .update(updateFields)
        .returning('*');

      if (!calendar) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Calendar not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calendar),
      };
    } catch (error) {
      console.error('Error updating calendar:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to update calendar' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
