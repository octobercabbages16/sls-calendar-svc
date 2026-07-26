import { AttendeesService } from "./AttendeesService"

export const handler = async (event: any = {}, context: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  let svc = new AttendeesService();

  return { 
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Headers" : "X-Requested-With,Content-Type",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
        body: JSON.stringify(await svc.processRequest(event))
      }
};
