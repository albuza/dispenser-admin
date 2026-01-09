import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { verifyDeviceAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/dispensers/[id]/nvs/version
 * Get NVS version for a dispenser (lightweight endpoint for sync check)
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
      ProjectionExpression: 'nvs_version',
    }));

    if (!result.Item) {
      return NextResponse.json({ error: 'Dispenser not found' }, { status: 404 });
    }

    const item = unmarshall(result.Item);
    return NextResponse.json({
      nvs_version: item.nvs_version || 0,
    });
  } catch (error) {
    console.error('Get NVS version error:', error);
    return NextResponse.json(
      { error: 'Failed to get NVS version' },
      { status: 500 }
    );
  }
}
