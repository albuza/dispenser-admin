import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { verifyDeviceAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/dispensers/[id]/status
 * Get current status of a dispenser
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Verify device authentication
  const auth = await verifyDeviceAuth(req);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  // Verify dispenser ID matches
  if (auth.dispenserId !== id) {
    return NextResponse.json({ error: 'Dispenser ID mismatch' }, { status: 403 });
  }

  try {
    const result = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.DISPENSERS,
      Key: marshall({ dispenser_id: id }),
      ProjectionExpression: 'dispenser_id, #n, #loc, #st, last_seen, total_dispensed_ml, pressure_psi, temperature_c',
      ExpressionAttributeNames: {
        '#n': 'name',
        '#loc': 'location',
        '#st': 'status',
      },
    }));

    if (!result.Item) {
      return NextResponse.json({ error: 'Dispenser not found' }, { status: 404 });
    }

    const item = unmarshall(result.Item);

    // Determine online/offline status based on last_seen
    const lastSeen = item.last_seen || 0;
    const now = Date.now();
    const offlineThreshold = 5 * 60 * 1000; // 5 minutes
    const isOnline = (now - lastSeen) < offlineThreshold;

    return NextResponse.json({
      dispenser_id: item.dispenser_id,
      name: item.name,
      location: item.location,
      status: isOnline ? 'online' : 'offline',
      last_seen: lastSeen,
      total_dispensed_ml: item.total_dispensed_ml || 0,
      pressure_psi: item.pressure_psi || 0,
      temperature_c: item.temperature_c || 0,
    });
  } catch (error) {
    console.error('Get status error:', error);
    return NextResponse.json(
      { error: 'Failed to get dispenser status' },
      { status: 500 }
    );
  }
}
