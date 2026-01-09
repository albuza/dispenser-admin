import { NextRequest, NextResponse } from 'next/server';
import { ScanCommand, QueryCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { requireAuth } from '@/lib/auth';
import { Order, Venue } from '@/lib/tables';

// GET /api/admin/orders - List orders with filters
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'venue_owner');
  if (auth instanceof NextResponse) return auth;

  const venueId = req.nextUrl.searchParams.get('venue_id');
  const status = req.nextUrl.searchParams.get('status');
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

  try {
    let orders: Order[] = [];

    if (venueId) {
      // Check venue access for non-super_admin
      if (auth.user?.role !== 'super_admin') {
        const venueResult = await dynamodb.send(new GetItemCommand({
          TableName: TABLES.VENUES,
          Key: marshall({ venue_id: venueId }),
          ProjectionExpression: 'owner_id',
        }));
        if (!venueResult.Item) {
          return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
        }
        const venue = unmarshall(venueResult.Item);
        if (venue.owner_id !== auth.user?.user_id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      // Query by venue_id using GSI
      const result = await dynamodb.send(new QueryCommand({
        TableName: TABLES.ORDERS,
        IndexName: 'venue_id-created_at-index',
        KeyConditionExpression: 'venue_id = :venue_id',
        ExpressionAttributeValues: marshall({ ':venue_id': venueId }),
        ScanIndexForward: false,
        Limit: limit,
      }));
      orders = (result.Items || []).map(item => unmarshall(item) as Order);
    } else if (auth.user?.role === 'super_admin') {
      // Super admin can see all orders
      const result = await dynamodb.send(new ScanCommand({
        TableName: TABLES.ORDERS,
        Limit: limit,
      }));
      orders = (result.Items || []).map(item => unmarshall(item) as Order);
      // Sort by created_at desc
      orders.sort((a, b) => b.created_at - a.created_at);
    } else {
      // Venue owner: get venues they own and query orders for each
      const venuesResult = await dynamodb.send(new QueryCommand({
        TableName: TABLES.VENUES,
        IndexName: 'owner_id-index',
        KeyConditionExpression: 'owner_id = :owner_id',
        ExpressionAttributeValues: marshall({ ':owner_id': auth.user?.user_id }),
      }));

      const venues = (venuesResult.Items || []).map(item => unmarshall(item) as Venue);

      for (const venue of venues) {
        const ordersResult = await dynamodb.send(new QueryCommand({
          TableName: TABLES.ORDERS,
          IndexName: 'venue_id-created_at-index',
          KeyConditionExpression: 'venue_id = :venue_id',
          ExpressionAttributeValues: marshall({ ':venue_id': venue.venue_id }),
          ScanIndexForward: false,
          Limit: Math.ceil(limit / venues.length),
        }));
        orders.push(...(ordersResult.Items || []).map(item => unmarshall(item) as Order));
      }

      // Sort combined results
      orders.sort((a, b) => b.created_at - a.created_at);
      orders = orders.slice(0, limit);
    }

    // Apply filters
    if (status) {
      orders = orders.filter(o => o.status === status);
    }
    if (from) {
      const fromTime = parseInt(from);
      orders = orders.filter(o => o.created_at >= fromTime);
    }
    if (to) {
      const toTime = parseInt(to);
      orders = orders.filter(o => o.created_at <= toTime);
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
