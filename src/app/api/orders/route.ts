import { NextRequest, NextResponse } from 'next/server';
import { PutItemCommand, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { Order, VenueDispenser, Beer, CreateOrderInput } from '@/lib/tables';
import { randomUUID } from 'crypto';

// POST /api/orders - Create a new order
export async function POST(req: NextRequest) {
  try {
    const body: CreateOrderInput = await req.json();

    if (!body.venue_id || !body.dispenser_id || !body.customer_id) {
      return NextResponse.json(
        { error: 'venue_id, dispenser_id, and customer_id are required' },
        { status: 400 }
      );
    }

    // Get venue dispenser info
    const vdResult = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.VENUE_DISPENSERS,
      Key: marshall({
        venue_id: body.venue_id,
        dispenser_id: body.dispenser_id,
      }),
    }));

    if (!vdResult.Item) {
      return NextResponse.json(
        { error: 'Dispenser not found in this venue' },
        { status: 404 }
      );
    }

    const venueDispenser = unmarshall(vdResult.Item) as VenueDispenser;

    if (!venueDispenser.is_active) {
      return NextResponse.json(
        { error: 'Dispenser is not active' },
        { status: 400 }
      );
    }

    // Get beer info
    const beerResult = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.BEERS,
      Key: marshall({ beer_id: venueDispenser.beer_id }),
    }));

    if (!beerResult.Item) {
      return NextResponse.json(
        { error: 'Beer not found' },
        { status: 404 }
      );
    }

    const beer = unmarshall(beerResult.Item) as Beer;

    const now = Date.now();
    const order: Order = {
      order_id: randomUUID(),
      venue_id: body.venue_id,
      dispenser_id: body.dispenser_id,
      beer_id: venueDispenser.beer_id,
      customer_id: body.customer_id,
      dispenser_number: venueDispenser.dispenser_number,

      // Order info (snapshot)
      beer_name: beer.name,
      volume_ml: venueDispenser.volume_ml,
      price: venueDispenser.price,

      // Status
      status: 'pending',
      status_history: [{
        status: 'pending',
        timestamp: now,
        message: 'Order created',
      }],

      // Payment (to be filled later)
      payment_method: null,

      // Timestamps
      created_at: now,
      updated_at: now,
    };

    await dynamodb.send(new PutItemCommand({
      TableName: TABLES.ORDERS,
      Item: marshall(order, { removeUndefinedValues: true }),
    }));

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

// GET /api/orders - List orders (admin only, with filters)
export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venue_id');
  const dispenserId = req.nextUrl.searchParams.get('dispenser_id');
  const customerId = req.nextUrl.searchParams.get('customer_id');
  const status = req.nextUrl.searchParams.get('status');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);

  try {
    let orders: Order[] = [];

    if (venueId) {
      const result = await dynamodb.send(new QueryCommand({
        TableName: TABLES.ORDERS,
        IndexName: 'venue_id-created_at-index',
        KeyConditionExpression: 'venue_id = :venue_id',
        ExpressionAttributeValues: marshall({ ':venue_id': venueId }),
        ScanIndexForward: false, // Descending order
        Limit: limit,
      }));
      orders = (result.Items || []).map(item => unmarshall(item) as Order);
    } else if (dispenserId) {
      const result = await dynamodb.send(new QueryCommand({
        TableName: TABLES.ORDERS,
        IndexName: 'dispenser_id-created_at-index',
        KeyConditionExpression: 'dispenser_id = :dispenser_id',
        ExpressionAttributeValues: marshall({ ':dispenser_id': dispenserId }),
        ScanIndexForward: false,
        Limit: limit,
      }));
      orders = (result.Items || []).map(item => unmarshall(item) as Order);
    } else if (customerId) {
      const result = await dynamodb.send(new QueryCommand({
        TableName: TABLES.ORDERS,
        IndexName: 'customer_id-created_at-index',
        KeyConditionExpression: 'customer_id = :customer_id',
        ExpressionAttributeValues: marshall({ ':customer_id': customerId }),
        ScanIndexForward: false,
        Limit: limit,
      }));
      orders = (result.Items || []).map(item => unmarshall(item) as Order);
    } else {
      return NextResponse.json(
        { error: 'venue_id, dispenser_id, or customer_id query parameter is required' },
        { status: 400 }
      );
    }

    // Filter by status if provided
    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('List orders error:', error);
    return NextResponse.json(
      { error: 'Failed to list orders' },
      { status: 500 }
    );
  }
}
