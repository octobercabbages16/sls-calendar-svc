import { EventService } from "./EventService"

export const handler = async (event: any = {}, context: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  let svc = new EventService();
  return svc.processRequest(event);
};
