import { IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane';

export const iotClient = new IoTDataPlaneClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  endpoint: process.env.AWS_IOT_ENDPOINT,
});
