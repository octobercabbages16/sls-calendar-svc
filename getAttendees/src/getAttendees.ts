import { AttendeesService } from "./AttendeesService"

export const handler = async (event: any = {}, context: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  let svc = new AttendeesService();
  return svc.processRequest(event);
};
