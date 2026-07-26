import { CalendarService } from "./CalendarService"

export const handler = async (event: any = {}, context: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  let svc = new CalendarService();
  return svc.processRequest(event);
};
