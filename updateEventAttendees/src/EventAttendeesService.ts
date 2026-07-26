import knex, { Knex } from 'knex';
import { SecretSanta } from './SecretSanta';

interface UpdateEventAttendeeInput {
  display_name?: string;
  rsvp_status?: string;
  role?: string;
}

interface DbSecret {
  host: string;
  port: number;
  username: string;
  password: string;
  dbInstanceIdentifier: string;
}

export class EventAttendeesService {
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
    const attendeeId = event.pathParameters?.id;

    if (!attendeeId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'attendee id is required' }),
      };
    }

    const body: UpdateEventAttendeeInput =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;

    const updateFields: Record<string, any> = {};

    if (body.display_name !== undefined) updateFields.display_name = body.display_name;
    if (body.rsvp_status !== undefined) updateFields.rsvp_status = body.rsvp_status;
    if (body.role !== undefined) updateFields.role = body.role;

    if (Object.keys(updateFields).length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'At least one field to update is required' }),
      };
    }

    const validRsvpStatuses = ['needs_action', 'accepted', 'declined', 'tentative'];
    if (body.rsvp_status && !validRsvpStatuses.includes(body.rsvp_status)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `rsvp_status must be one of: ${validRsvpStatuses.join(', ')}` }),
      };
    }

    const validRoles = ['organizer', 'attendee', 'optional'];
    if (body.role && !validRoles.includes(body.role)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `role must be one of: ${validRoles.join(', ')}` }),
      };
    }

    const db = await this.getDbConnection();

    try {
      const [attendee] = await db('portal.event_attendees')
        .where({ id: attendeeId })
        .update(updateFields)
        .returning('*');

      if (!attendee) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Event attendee not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendee),
      };
    } catch (error) {
      console.error('Error updating event attendee:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to update event attendee' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
