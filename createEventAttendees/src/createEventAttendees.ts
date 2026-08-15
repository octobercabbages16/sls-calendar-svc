import { EventAttendeesService } from "./EventAttendeesService"

export const handler = async (event: any = {}, context: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  let svc = new EventAttendeesService();

  return await svc.processRequest(event);
};
