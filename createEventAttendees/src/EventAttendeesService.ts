import knex, { Knex } from 'knex';
import { SecretSanta } from './SecretSanta';

interface CreateEventAttendeeInput {
  event_id: string;
  student_id?: number;
  user_id?: string;
  email?: string;
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
    let body: CreateEventAttendeeInput;

    // If coming from state machine with attendee account data
    if (event.getAttendeesAccountsResult && event.createEventResult) {
      const createEventBody = typeof event.createEventResult.body === 'string'
        ? JSON.parse(event.createEventResult.body)
        : event.createEventResult.body;

      const innerBody = typeof createEventBody.body === 'string'
        ? JSON.parse(createEventBody.body)
        : createEventBody;

      const attendeesData = typeof event.getAttendeesAccountsResult.body === 'string'
        ? JSON.parse(event.getAttendeesAccountsResult.body)
        : event.getAttendeesAccountsResult.body;

      const attendee = Array.isArray(attendeesData) ? attendeesData[0] : attendeesData;

      body = {
        event_id: innerBody.id,
        user_id: attendee.user_id,
        email: attendee.email,
        display_name: attendee.display_name,
        rsvp_status: 'confirmed',
        role: 'attendee',
      };
    } else {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;
    }

    const { event_id, student_id, user_id, email, display_name, rsvp_status, role } = body;

    if (!event_id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'event_id is required' }),
      };
    }

    const validRsvpStatuses = ['needs_action', 'accepted', 'declined', 'tentative'];
    if (rsvp_status && !validRsvpStatuses.includes(rsvp_status)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `rsvp_status must be one of: ${validRsvpStatuses.join(', ')}` }),
      };
    }

    const validRoles = ['organizer', 'attendee', 'optional'];
    if (role && !validRoles.includes(role)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `role must be one of: ${validRoles.join(', ')}` }),
      };
    }

    const db = await this.getDbConnection();

    try {
      const now = new Date().toISOString();

      console.log('Inserting attendee:', { event_id, student_id, user_id, email, display_name, rsvp_status, role });

      const [attendee] = await db('portal.event_attendees')
        .insert({
          event_id,
          student_id: student_id || null,
          user_id: user_id || null,
          email: email || null,
          display_name: display_name || null,
          rsvp_status: rsvp_status || 'needs_action',
          role: role || 'attendee',
          created_at: now
        })
        .returning('*');

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendee),
      };
    } catch (error) {
      console.error('Error creating event attendee:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to create event attendee' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
