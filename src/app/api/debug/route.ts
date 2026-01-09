import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    env: {
      APP_REGION: process.env.APP_REGION || 'not set',
      APP_ACCESS_KEY_ID: process.env.APP_ACCESS_KEY_ID ? 'set (hidden)' : 'not set',
      APP_SECRET_ACCESS_KEY: process.env.APP_SECRET_ACCESS_KEY ? 'set (hidden)' : 'not set',
      IOT_ENDPOINT: process.env.IOT_ENDPOINT || 'not set',
    },
    timestamp: new Date().toISOString(),
  });
}
