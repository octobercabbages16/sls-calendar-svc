import { EventRemindersService } from "./EventRemindersService"

export const handler = async (event: any = {}, context: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  let svc = new EventRemindersService();

  return 
        body: await svc.processRequest(event);
};
