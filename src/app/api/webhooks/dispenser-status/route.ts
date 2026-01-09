import { NextRequest, NextResponse } from 'next/server';
import { UpdateItemCommand, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { verifyDeviceAuth } from '@/lib/auth';
import { Order, StatusHistoryEntry, DispenseLog, CreateDispenseLogInput } from '@/lib/tables';
import { randomUUID } from 'crypto';

interface DispenserStatusUpdate {
  status: 'dispensing' | 'completed' | 'error';
  order_id: string;
  dispensed_ml?: number;
  duration_ms?: number;
  flowmeter_pulses?: number;
  pressure_psi?: number;
  temperature_c?: number;
  keg_remaining_pct?: number;
  error_code?: string;
  error_message?: string;
  timestamp: number;
}

// POST /api/webhooks/dispenser-status - Receive status updates from ESP32
export async function POST(req: NextRequest) {
  // Verify device authentication
  const auth = await verifyDeviceAuth(req);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body: DispenserStatusUpdate = await req.json();

    if (!body.order_id || !body.status) {
      return NextResponse.json(
        { error: 'order_id and status are required' },
        { status: 400 }
      );
    }

    // Get order to verify it exists
    const orderResult = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.ORDERS,
      Key: marshall({ order_id: body.order_id }),
    }));

    if (!orderResult.Item) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = unmarshall(orderResult.Item) as Order;

    // Verify dispenser matches
    if (order.dispenser_id !== auth.dispenserId) {
      return NextResponse.json(
        { error: 'Dispenser ID mismatch' },
        { status: 403 }
      );
    }

    const now = Date.now();

    if (body.status === 'completed') {
      // Update order status to completed
      const newStatusEntry: StatusHistoryEntry = {
        status: 'completed',
        timestamp: now,
        message: `Dispensing completed. Dispensed ${body.dispensed_ml || 0}ml in ${body.duration_ms || 0}ms`,
      };

      await dynamodb.send(new UpdateItemCommand({
        TableName: TABLES.ORDERS,
        Key: marshall({ order_id: body.order_id }),
        UpdateExpression: 'SET #status = :status, status_history = list_append(status_history, :history), dispensed_ml = :dispensed_ml, dispense_completed_at = :completed_at, updated_at = :updated_at',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: marshall({
          ':status': 'completed',
          ':history': [newStatusEntry],
          ':dispensed_ml': body.dispensed_ml || 0,
          ':completed_at': now,
          ':updated_at': now,
        }),
      }));

      // Create dispense log
      const logInput: CreateDispenseLogInput = {
        dispenser_id: auth.dispenserId!,
        order_id: body.order_id,
        venue_id: order.venue_id,
        trigger_type: 'online_order',
        volume_ml: body.dispensed_ml || 0,
        duration_ms: body.duration_ms || 0,
        flowmeter_pulses: body.flowmeter_pulses,
        pressure_psi: body.pressure_psi,
        temperature_c: body.temperature_c,
        keg_remaining_pct: body.keg_remaining_pct,
        success: true,
        timestamp: body.timestamp || now,
      };

      const log: DispenseLog = {
        log_id: randomUUID(),
        ...logInput,
        created_at: now,
      };

      await dynamodb.send(new PutItemCommand({
        TableName: TABLES.DISPENSE_LOGS,
        Item: marshall(log, { removeUndefinedValues: true }),
      }));

    } else if (body.status === 'error') {
      // Update order status to failed
      const newStatusEntry: StatusHistoryEntry = {
        status: 'failed',
        timestamp: now,
        message: body.error_message || `Dispensing failed: ${body.error_code || 'Unknown error'}`,
      };

      await dynamodb.send(new UpdateItemCommand({
        TableName: TABLES.ORDERS,
        Key: marshall({ order_id: body.order_id }),
        UpdateExpression: 'SET #status = :status, status_history = list_append(status_history, :history), updated_at = :updated_at',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: marshall({
          ':status': 'failed',
          ':history': [newStatusEntry],
          ':updated_at': now,
        }),
      }));

      // Create error log
      const log: DispenseLog = {
        log_id: randomUUID(),
        dispenser_id: auth.dispenserId!,
        order_id: body.order_id,
        venue_id: order.venue_id,
        trigger_type: 'online_order',
        volume_ml: body.dispensed_ml || 0,
        duration_ms: body.duration_ms || 0,
        flowmeter_pulses: body.flowmeter_pulses,
        pressure_psi: body.pressure_psi,
        temperature_c: body.temperature_c,
        keg_remaining_pct: body.keg_remaining_pct,
        success: false,
        error_code: body.error_code,
        error_message: body.error_message,
        timestamp: body.timestamp || now,
        created_at: now,
      };

      await dynamodb.send(new PutItemCommand({
        TableName: TABLES.DISPENSE_LOGS,
        Item: marshall(log, { removeUndefinedValues: true }),
      }));
    }
    // For 'dispensing' status, we just acknowledge (order status already set by dispense API)

    return NextResponse.json({
      success: true,
      received_status: body.status,
    });
  } catch (error) {
    console.error('Dispenser status webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process status update' },
      { status: 500 }
    );
  }
}
