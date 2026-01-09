import { IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane';

export const iotClient = new IoTDataPlaneClient({
  region: process.env.APP_REGION || 'ap-northeast-2',
  endpoint: process.env.IOT_ENDPOINT,
});
