import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { Order, StatusHistoryEntry, PaymentMethod } from '@/lib/tables';

type RouteContext = { params: Promise<{ orderId: string }> };

interface PayRequest {
  payment_method: PaymentMethod;
  payment_key?: string;
}

// POST /api/orders/[orderId]/pay - Process payment (mock for now, to be integrated with TossPayments)
export async function POST(req: NextRequest, context: RouteContext) {
  const { orderId } = await context.params;

  try {
    const body: PayRequest = await req.json();

    if (!body.payment_method) {
      return NextResponse.json(
        { error: 'payment_method is required' },
        { status: 400 }
      );
    }

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

    // Check if order is in correct status
    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot pay for order in '${order.status}' status. Order must be 'pending'.` },
        { status: 400 }
      );
    }

    const now = Date.now();

    // TODO: Integrate with TossPayments
    // For now, mock the payment as successful
    const newStatusEntry: StatusHistoryEntry = {
      status: 'paid',
      timestamp: now,
      message: `Payment processed via ${body.payment_method}`,
    };

    await dynamodb.send(new UpdateItemCommand({
      TableName: TABLES.ORDERS,
      Key: marshall({ order_id: orderId }),
      UpdateExpression: 'SET #status = :status, status_history = list_append(status_history, :history), payment_method = :payment_method, payment_key = :payment_key, payment_approved_at = :approved_at, updated_at = :updated_at',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: marshall({
        ':status': 'paid',
        ':history': [newStatusEntry],
        ':payment_method': body.payment_method,
        ':payment_key': body.payment_key || `mock_${orderId}_${now}`,
        ':approved_at': now,
        ':updated_at': now,
      }, { removeUndefinedValues: true }),
    }));

    // Update order status to ready (customer can now dispense)
    const readyStatusEntry: StatusHistoryEntry = {
      status: 'ready',
      timestamp: now + 1, // Add 1ms to ensure proper ordering
      message: 'Ready for dispensing',
    };

    await dynamodb.send(new UpdateItemCommand({
      TableName: TABLES.ORDERS,
      Key: marshall({ order_id: orderId }),
      UpdateExpression: 'SET #status = :status, status_history = list_append(status_history, :history), updated_at = :updated_at',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: marshall({
        ':status': 'ready',
        ':history': [readyStatusEntry],
        ':updated_at': now + 1,
      }),
    }));

    return NextResponse.json({
      success: true,
      order_id: orderId,
      status: 'ready',
      dispenser_number: order.dispenser_number,
      message: 'Payment successful. Ready for dispensing.',
    });
  } catch (error) {
    console.error('Pay error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
