import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { PublishCommand } from '@aws-sdk/client-iot-data-plane';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { iotClient } from '@/lib/iot';
import { Order, OrderStatus, StatusHistoryEntry } from '@/lib/tables';

type RouteContext = { params: Promise<{ orderId: string }> };

interface DispenseCommand {
  action: 'dispense';
  order_id: string;
  timestamp: number;
}

// POST /api/orders/[orderId]/dispense - Start dispensing for an order
export async function POST(req: NextRequest, context: RouteContext) {
  const { orderId } = await context.params;

  try {
    // Get order
    const result = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.ORDERS,
      Key: marshall({ order_id: orderId }),
    }));

    if (!result.Item) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = unmarshall(result.Item) as Order;

    // Check if order is in correct status (paid or ready)
    if (order.status !== 'paid' && order.status !== 'ready') {
      return NextResponse.json(
        { error: `Cannot dispense order in '${order.status}' status. Order must be 'paid' or 'ready'.` },
        { status: 400 }
      );
    }

    const now = Date.now();

    // Update order status to dispensing
    const newStatusEntry: StatusHistoryEntry = {
      status: 'dispensing',
      timestamp: now,
      message: 'Dispensing started',
    };

    await dynamodb.send(new UpdateItemCommand({
      TableName: TABLES.ORDERS,
      Key: marshall({ order_id: orderId }),
      UpdateExpression: 'SET #status = :status, status_history = list_append(status_history, :history), dispense_started_at = :started_at, updated_at = :updated_at',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: marshall({
        ':status': 'dispensing',
        ':history': [newStatusEntry],
        ':started_at': now,
        ':updated_at': now,
      }),
    }));

    // Send MQTT command to dispenser
    const dispenseCommand: DispenseCommand = {
      action: 'dispense',
      order_id: orderId,
      timestamp: now,
    };

    const topic = `dispenser/${order.dispenser_id}/command`;

    await iotClient.send(new PublishCommand({
      topic,
      payload: Buffer.from(JSON.stringify(dispenseCommand)),
      qos: 1,
    }));

    return NextResponse.json({
      success: true,
      order_id: orderId,
      status: 'dispensing',
      dispenser_id: order.dispenser_id,
      dispenser_number: order.dispenser_number,
      topic,
    });
  } catch (error) {
    console.error('Dispense error:', error);
    return NextResponse.json(
      { error: 'Failed to start dispensing' },
      { status: 500 }
    );
  }
}
