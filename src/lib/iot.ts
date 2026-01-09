import { IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane';

// Amplify blocks AWS_ prefix, so use custom env vars
const credentials = process.env.APP_ACCESS_KEY_ID && process.env.APP_SECRET_ACCESS_KEY
  ? {
      accessKeyId: process.env.APP_ACCESS_KEY_ID,
      secretAccessKey: process.env.APP_SECRET_ACCESS_KEY,
    }
  : undefined;

export const iotClient = new IoTDataPlaneClient({
  region: process.env.APP_REGION || 'ap-northeast-2',
  endpoint: process.env.IOT_ENDPOINT ? `https://${process.env.IOT_ENDPOINT}` : undefined,
  ...(credentials && { credentials }),
});
