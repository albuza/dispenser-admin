import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { verifyDeviceAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Check if request is from web admin (no device auth headers)
 * In production, this should be replaced with proper session/JWT auth
 */
function isWebAdminRequest(req: NextRequest): boolean {
  const hasDeviceHeaders = req.headers.get('X-Dispenser-ID') &&
                           req.headers.get('X-Timestamp') &&
                           req.headers.get('X-Signature');
  return !hasDeviceHeaders;
}

/**
 * GET /api/dispensers/[id]/nvs
 * Get NVS settings for a dispenser
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Web admin requests skip device auth (TODO: add session auth in production)
  if (!isWebAdminRequest(req)) {
    // Verify device authentication
    const auth = await verifyDeviceAuth(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Verify dispenser ID matches
    if (auth.dispenserId !== id) {
      return NextResponse.json({ error: 'Dispenser ID mismatch' }, { status: 403 });
    }
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

  // Web admin requests skip device auth (TODO: add session auth in production)
  if (!isWebAdminRequest(req)) {
    // Verify device authentication
    const auth = await verifyDeviceAuth(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Verify dispenser ID matches
    if (auth.dispenserId !== id) {
      return NextResponse.json({ error: 'Dispenser ID mismatch' }, { status: 403 });
    }
  }

  try {
    const body = await req.json();
    const { nvs_settings } = body;

    if (!nvs_settings) {
      return NextResponse.json(
        { error: 'Missing nvs_settings' },
        { status: 400 }
      );
    }

    // Generate new version (current timestamp in seconds)
    const nvs_version = Math.floor(Date.now() / 1000);

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
