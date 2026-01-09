import { NextRequest, NextResponse } from 'next/server';
import { PublishCommand } from '@aws-sdk/client-iot-data-plane';
import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { iotClient } from '@/lib/iot';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { verifyDeviceAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PermitRequest {
  nfc_uid: string;
  timestamp: number;
}

interface PermitResponse {
  action: 'permit_response';
  permitted: boolean;
  max_ml: number;
  user_name?: string;
  message: string;
}

/**
 * POST /api/dispensers/[id]/permit
 * Request dispensing permission (ESP32 sends NFC UID, server responds via MQTT)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
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
    const body: PermitRequest = await req.json();
    const { nfc_uid } = body;

    if (!nfc_uid) {
      return NextResponse.json(
        { error: 'Missing nfc_uid' },
        { status: 400 }
      );
    }

    // Check if dispenser exists
    const dispenserResult = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.DISPENSERS,
      Key: marshall({ dispenser_id: id }),
      ProjectionExpression: 'dispenser_id, #n',
      ExpressionAttributeNames: {
        '#n': 'name',
      },
    }));

    if (!dispenserResult.Item) {
      return NextResponse.json({ error: 'Dispenser not found' }, { status: 404 });
    }

    // TODO: Implement NFC UID lookup from users table
    // For now, allow all NFC cards with default max_ml
    const permitResponse: PermitResponse = {
      action: 'permit_response',
      permitted: true,
      max_ml: 500, // Default max ml
      user_name: 'Guest',
      message: 'Dispensing permitted',
    };

    // Publish permit response to MQTT topic
    const topic = `dispenser/${id}/permit`;

    await iotClient.send(new PublishCommand({
      topic,
      payload: Buffer.from(JSON.stringify(permitResponse)),
      qos: 1,
    }));

    return NextResponse.json({
      success: true,
      topic,
      response: permitResponse,
    });
  } catch (error) {
    console.error('Permit error:', error);
    return NextResponse.json(
      { error: 'Failed to process permit request' },
      { status: 500 }
    );
  }
}
