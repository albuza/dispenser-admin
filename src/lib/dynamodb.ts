import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Amplify blocks AWS_ prefix, so use custom env vars
const credentials = process.env.APP_ACCESS_KEY_ID && process.env.APP_SECRET_ACCESS_KEY
  ? {
      accessKeyId: process.env.APP_ACCESS_KEY_ID,
      secretAccessKey: process.env.APP_SECRET_ACCESS_KEY,
    }
  : undefined;

export const dynamodb = new DynamoDBClient({
  region: process.env.APP_REGION || 'ap-northeast-2',
  ...(credentials && { credentials }),
});

export const TABLES = {
  DISPENSERS: 'dispensers',
  DISPENSE_LOGS: 'dispense_logs',
} as const;
