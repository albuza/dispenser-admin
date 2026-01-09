import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { Order } from '@/lib/tables';

type RouteContext = { params: Promise<{ orderId: string }> };

// GET /api/orders/[orderId]/status - Get order status (for polling)
export async function GET(req: NextRequest, context: RouteContext) {
  const { orderId } = await context.params;

  try {
    const result = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.ORDERS,
      Key: marshall({ order_id: orderId }),
      ProjectionExpression: 'order_id, #status, status_history, dispenser_number, dispensed_ml, dispense_started_at, dispense_completed_at',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
    }));

    if (!result.Item) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = unmarshall(result.Item) as Partial<Order>;

    return NextResponse.json({
      order_id: order.order_id,
      status: order.status,
      dispenser_number: order.dispenser_number,
      dispensed_ml: order.dispensed_ml,
      dispense_started_at: order.dispense_started_at,
      dispense_completed_at: order.dispense_completed_at,
      latest_status: order.status_history?.[order.status_history.length - 1],
    });
  } catch (error) {
    console.error('Get order status error:', error);
    return NextResponse.json(
      { error: 'Failed to get order status' },
      { status: 500 }
    );
  }
}
