import { CalendarSharesService } from "./CalendarSharesService"

export const handler = async (event: any = {}, context: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  let svc = new CalendarSharesService();
  return svc.processRequest(event);
};
