import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export const dynamodb = new DynamoDBClient({
  region: process.env.APP_REGION || 'ap-northeast-2',
});

export const TABLES = {
  DISPENSERS: 'dispensers',
  DISPENSE_LOGS: 'dispense_logs',
} as const;
