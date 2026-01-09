import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { Order } from '@/lib/tables';

type RouteContext = { params: Promise<{ orderId: string }> };

// GET /api/orders/[orderId] - Get order details
export async function GET(req: NextRequest, context: RouteContext) {
  const { orderId } = await context.params;

  try {
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

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { error: 'Failed to get order' },
      { status: 500 }
    );
  }
}
