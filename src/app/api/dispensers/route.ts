import { NextRequest, NextResponse } from 'next/server';
import { QueryCommand, ScanCommand, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { randomBytes } from 'crypto';

/**
 * GET /api/dispensers
 * List all dispensers (optionally filtered by owner_id)
 */
export async function GET(req: NextRequest) {
  try {
    const ownerId = req.nextUrl.searchParams.get('owner_id');

    let items: Record<string, unknown>[] = [];

    if (ownerId) {
      // Query by owner_id (requires GSI on owner_id)
      const result = await dynamodb.send(new QueryCommand({
        TableName: TABLES.DISPENSERS,
        IndexName: 'owner_id-index',
        KeyConditionExpression: 'owner_id = :oid',
        ExpressionAttributeValues: {
          ':oid': { S: ownerId },
        },
      }));
      items = (result.Items || []).map(item => unmarshall(item));
    } else {
      // Scan all (for admin use, should be paginated in production)
      const result = await dynamodb.send(new ScanCommand({
        TableName: TABLES.DISPENSERS,
        Limit: 100,
      }));
      items = (result.Items || []).map(item => unmarshall(item));
    }

    // Remove sensitive fields
    const sanitized = items.map(item => {
      const { device_secret, ...rest } = item as Record<string, unknown>;
      return rest;
    });

    return NextResponse.json({
      dispensers: sanitized,
      count: sanitized.length,
    });
  } catch (error) {
    console.error('List dispensers error:', error);
    return NextResponse.json(
      { error: 'Failed to list dispensers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dispensers
 * Register/provision a new dispenser
 * Body: { dispenser_id: string, name?: string, location?: string }
 * Returns: { dispenser_id, device_secret, nvs_version }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dispenser_id, name, location } = body;

    if (!dispenser_id) {
      return NextResponse.json(
        { error: 'Missing dispenser_id' },
        { status: 400 }
      );
    }

    // Check if dispenser already exists
    const existing = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.DISPENSERS,
      Key: marshall({ dispenser_id }),
      ProjectionExpression: 'dispenser_id, device_secret',
    }));

    if (existing.Item) {
      const item = unmarshall(existing.Item);
      // Already exists, return existing device_secret
      return NextResponse.json({
        dispenser_id,
        device_secret: item.device_secret,
        message: 'Dispenser already registered',
        existing: true,
      });
    }

    // Generate new device secret (32 bytes = 64 hex chars)
    const device_secret = randomBytes(32).toString('hex');
    const now = Date.now();
    const nvs_version = Math.floor(now / 1000);

    // Create new dispenser record
    await dynamodb.send(new PutItemCommand({
      TableName: TABLES.DISPENSERS,
      Item: marshall({
        dispenser_id,
        device_secret,
        // Generate name from MAC: "A4:CF:12:34:56:78" -> "DPS_A4CF12345678"
        name: name || `DPS_${dispenser_id.replace(/:/g, '')}`,
        location: location || '',
        nvs_version,
        nvs_settings: {},
        status: 'offline',
        created_at: now,
        updated_at: now,
      }),
    }));

    return NextResponse.json({
      dispenser_id,
      device_secret,
      nvs_version,
      message: 'Dispenser registered successfully',
      existing: false,
    });
  } catch (error) {
    console.error('Register dispenser error:', error);
    return NextResponse.json(
      { error: 'Failed to register dispenser' },
      { status: 500 }
    );
  }
}
