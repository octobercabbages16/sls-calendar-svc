import knex, { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { SecretSanta } from './SecretSanta';

interface CreateRecurrenceRuleInput {
  event_id: string;
  frequency: string;
  interval_value?: number;
  by_day?: string;
  by_month_day?: string;
  by_month?: string;
  count?: number;
  until_date?: string;
}

interface DbSecret {
  host: string;
  port: number;
  username: string;
  password: string;
  dbInstanceIdentifier: string;
}

export class RecurrenceRulesService {
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
    const body: CreateRecurrenceRuleInput =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;

    const { event_id, frequency, interval_value, by_day, by_month_day, by_month, count, until_date } = body;

    if (!event_id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'event_id is required' }),
      };
    }

    if (!frequency) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'frequency is required' }),
      };
    }

    const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validFrequencies.includes(frequency)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `frequency must be one of: ${validFrequencies.join(', ')}` }),
      };
    }

    if (count && until_date) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Cannot specify both count and until_date' }),
      };
    }

    const db = await this.getDbConnection();

    try {
      const id = uuidv4();

      const [recurrenceRule] = await db('portal.recurrence_rules')
        .insert({
          id,
          event_id,
          frequency,
          interval_value: interval_value || 1,
          by_day: by_day || null,
          by_month_day: by_month_day || null,
          by_month: by_month || null,
          count: count || null,
          until_date: until_date || null,
        })
        .returning('*');

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recurrenceRule),
      };
    } catch (error) {
      console.error('Error creating recurrence rule:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to create recurrence rule' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
