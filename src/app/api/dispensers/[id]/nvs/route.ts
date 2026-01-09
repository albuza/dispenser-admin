import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { verifyDeviceAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/dispensers/[id]/nvs
 * Get NVS settings for a dispenser
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
      ProjectionExpression: 'dispenser_id, nvs_settings, nvs_version, #n, #loc',
      ExpressionAttributeNames: {
        '#n': 'name',
        '#loc': 'location',
      },
    }));

    if (!result.Item) {
      return NextResponse.json({ error: 'Dispenser not found' }, { status: 404 });
    }

    const item = unmarshall(result.Item);
    return NextResponse.json({
      dispenser_id: item.dispenser_id,
      name: item.name,
      location: item.location,
      nvs_version: item.nvs_version || 0,
      nvs_settings: item.nvs_settings || {},
    });
  } catch (error) {
    console.error('Get NVS error:', error);
    return NextResponse.json(
      { error: 'Failed to get NVS settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/dispensers/[id]/nvs
 * Update NVS settings for a dispenser
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
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
    const body = await req.json();
    const { nvs_settings, nvs_version } = body;

    if (!nvs_settings || typeof nvs_version !== 'number') {
      return NextResponse.json(
        { error: 'Missing nvs_settings or nvs_version' },
        { status: 400 }
      );
    }

    // Check for version conflict (optional)
    const current = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.DISPENSERS,
      Key: marshall({ dispenser_id: id }),
      ProjectionExpression: 'nvs_version',
    }));

    if (current.Item) {
      const currentItem = unmarshall(current.Item);
      if (currentItem.nvs_version && currentItem.nvs_version > nvs_version) {
        return NextResponse.json({
          error: 'Version conflict',
          server_version: currentItem.nvs_version,
        }, { status: 409 });
      }
    }

    // Update NVS settings
    await dynamodb.send(new UpdateItemCommand({
      TableName: TABLES.DISPENSERS,
      Key: marshall({ dispenser_id: id }),
      UpdateExpression: 'SET nvs_settings = :nvs, nvs_version = :ver, updated_at = :now',
      ExpressionAttributeValues: marshall({
        ':nvs': nvs_settings,
        ':ver': nvs_version,
        ':now': Date.now(),
      }),
    }));

    return NextResponse.json({
      success: true,
      nvs_version: nvs_version,
    });
  } catch (error) {
    console.error('Update NVS error:', error);
    return NextResponse.json(
      { error: 'Failed to update NVS settings' },
      { status: 500 }
    );
  }
}
