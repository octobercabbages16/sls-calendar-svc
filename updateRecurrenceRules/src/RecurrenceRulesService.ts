import knex, { Knex } from 'knex';
import { SecretSanta } from './SecretSanta';

interface UpdateRecurrenceRuleInput {
  frequency?: string;
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
    const ruleId = event.pathParameters?.id;

    if (!ruleId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'recurrence rule id is required' }),
      };
    }

    const body: UpdateRecurrenceRuleInput =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;

    const updateFields: Record<string, any> = {};

    if (body.frequency !== undefined) updateFields.frequency = body.frequency;
    if (body.interval_value !== undefined) updateFields.interval_value = body.interval_value;
    if (body.by_day !== undefined) updateFields.by_day = body.by_day;
    if (body.by_month_day !== undefined) updateFields.by_month_day = body.by_month_day;
    if (body.by_month !== undefined) updateFields.by_month = body.by_month;
    if (body.count !== undefined) updateFields.count = body.count;
    if (body.until_date !== undefined) updateFields.until_date = body.until_date;

    if (Object.keys(updateFields).length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'At least one field to update is required' }),
      };
    }

    const db = await this.getDbConnection();

    try {
      const [rule] = await db('portal.recurrence_rules')
        .where({ id: ruleId })
        .update(updateFields)
        .returning('*');

      if (!rule) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Recurrence rule not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      };
    } catch (error) {
      console.error('Error updating recurrence rule:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to update recurrence rule' }),
      };
    } finally {
      await db.destroy();
    }
  }
}
