import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';
import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from './dynamodb';

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

export interface AuthResult {
  valid: boolean;
  dispenserId?: string;
  error?: string;
}

/**
 * Verify HMAC signature from ESP32 device
 * Headers required:
 * - X-Dispenser-ID: Device ID
 * - X-Timestamp: Unix timestamp (seconds)
 * - X-Signature: HMAC-SHA256 signature
 */
export async function verifyDeviceAuth(req: NextRequest): Promise<AuthResult> {
  const dispenserId = req.headers.get('X-Dispenser-ID');
  const timestamp = req.headers.get('X-Timestamp');
  const signature = req.headers.get('X-Signature');

  if (!dispenserId || !timestamp || !signature) {
    return { valid: false, error: 'Missing authentication headers' };
  }

  // Verify timestamp is within tolerance
  const requestTime = parseInt(timestamp, 10) * 1000;
  const now = Date.now();
  if (Math.abs(now - requestTime) > TIMESTAMP_TOLERANCE_MS) {
    return { valid: false, error: 'Timestamp out of range' };
  }

  // Get device secret from DynamoDB
  try {
    const result = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.DISPENSERS,
      Key: marshall({ dispenser_id: dispenserId }),
      ProjectionExpression: 'device_secret',
    }));

    if (!result.Item) {
      return { valid: false, error: 'Device not found' };
    }

    const device = unmarshall(result.Item);
    const deviceSecret = device.device_secret;

    if (!deviceSecret) {
      return { valid: false, error: 'Device not provisioned' };
    }

    // Calculate expected signature
    const payload = `${dispenserId}${timestamp}`;
    const expectedSignature = createHmac('sha256', deviceSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true, dispenserId };
  } catch (error) {
    console.error('Auth error:', error);
    return { valid: false, error: 'Authentication failed' };
  }
}
