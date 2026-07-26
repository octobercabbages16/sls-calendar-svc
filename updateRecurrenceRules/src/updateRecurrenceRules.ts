import { RecurrenceRulesService } from "./RecurrenceRulesService"

export const handler = async (event: any = {}, context: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  let svc = new RecurrenceRulesService();
  return svc.processRequest(event);
};
