import { NextRequest, NextResponse } from 'next/server';
import { QueryCommand, PutItemCommand, DeleteItemCommand, GetItemCommand, BatchGetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { requireAuth } from '@/lib/auth';
import { VenueDispenser, CreateVenueDispenserInput, UpdateVenueDispenserInput, Beer, Venue } from '@/lib/tables';

// GET /api/admin/venue-dispensers?venue_id=xxx - List dispensers for a venue
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'venue_owner');
  if (auth instanceof NextResponse) return auth;

  const venueId = req.nextUrl.searchParams.get('venue_id');
  const dispenserId = req.nextUrl.searchParams.get('dispenser_id');

  try {
    let venueDispensers: VenueDispenser[];

    if (venueId) {
      // Get dispensers for a specific venue
      // First check if user has access to this venue
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

      const result = await dynamodb.send(new QueryCommand({
        TableName: TABLES.VENUE_DISPENSERS,
        KeyConditionExpression: 'venue_id = :venue_id',
        ExpressionAttributeValues: marshall({ ':venue_id': venueId }),
      }));
      venueDispensers = (result.Items || []).map(item => unmarshall(item) as VenueDispenser);
    } else if (dispenserId) {
      // Find venue for a specific dispenser (using GSI)
      const result = await dynamodb.send(new QueryCommand({
        TableName: TABLES.VENUE_DISPENSERS,
        IndexName: 'dispenser_id-index',
        KeyConditionExpression: 'dispenser_id = :dispenser_id',
        ExpressionAttributeValues: marshall({ ':dispenser_id': dispenserId }),
      }));
      venueDispensers = (result.Items || []).map(item => unmarshall(item) as VenueDispenser);
    } else {
      return NextResponse.json(
        { error: 'venue_id or dispenser_id query parameter is required' },
        { status: 400 }
      );
    }

    // Fetch beer details for each venue dispenser
    if (venueDispensers.length > 0) {
      const beerIds = [...new Set(venueDispensers.map(vd => vd.beer_id).filter(Boolean))];
      if (beerIds.length > 0) {
        const beerResult = await dynamodb.send(new BatchGetItemCommand({
          RequestItems: {
            [TABLES.BEERS]: {
              Keys: beerIds.map(id => marshall({ beer_id: id })),
            },
          },
        }));

        const beers = new Map<string, Beer>();
        (beerResult.Responses?.[TABLES.BEERS] || []).forEach(item => {
          const beer = unmarshall(item) as Beer;
          beers.set(beer.beer_id, beer);
        });

        // Add beer details to each venue dispenser
        const enrichedDispensers = venueDispensers.map(vd => ({
          ...vd,
          beer: beers.get(vd.beer_id) || null,
        }));

        return NextResponse.json({ venue_dispensers: enrichedDispensers });
      }
    }

    return NextResponse.json({ venue_dispensers: venueDispensers });
  } catch (error) {
    console.error('List venue dispensers error:', error);
    return NextResponse.json(
      { error: 'Failed to list venue dispensers' },
      { status: 500 }
    );
  }
}

// POST /api/admin/venue-dispensers - Create/update venue-dispenser mapping
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'venue_owner');
  if (auth instanceof NextResponse) return auth;

  try {
    const body: CreateVenueDispenserInput = await req.json();

    if (!body.venue_id || !body.dispenser_id || !body.beer_id) {
      return NextResponse.json(
        { error: 'venue_id, dispenser_id, and beer_id are required' },
        { status: 400 }
      );
    }

    // Check venue access
    if (auth.user?.role !== 'super_admin') {
      const venueResult = await dynamodb.send(new GetItemCommand({
        TableName: TABLES.VENUES,
        Key: marshall({ venue_id: body.venue_id }),
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

    const now = Date.now();
    const venueDispenser: VenueDispenser = {
      venue_id: body.venue_id,
      dispenser_id: body.dispenser_id,
      beer_id: body.beer_id,
      dispenser_number: body.dispenser_number ?? 1,
      position_description: body.position_description,
      price: body.price ?? 5000,
      volume_ml: body.volume_ml ?? 500,
      is_active: body.is_active ?? true,
      created_at: now,
      updated_at: now,
    };

    await dynamodb.send(new PutItemCommand({
      TableName: TABLES.VENUE_DISPENSERS,
      Item: marshall(venueDispenser, { removeUndefinedValues: true }),
    }));

    return NextResponse.json({ venue_dispenser: venueDispenser }, { status: 201 });
  } catch (error) {
    console.error('Create venue dispenser error:', error);
    return NextResponse.json(
      { error: 'Failed to create venue dispenser mapping' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/venue-dispensers - Update venue-dispenser mapping
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, 'venue_owner');
  if (auth instanceof NextResponse) return auth;

  try {
    const body: UpdateVenueDispenserInput & { venue_id: string; dispenser_id: string } = await req.json();

    if (!body.venue_id || !body.dispenser_id) {
      return NextResponse.json(
        { error: 'venue_id and dispenser_id are required' },
        { status: 400 }
      );
    }

    // Check venue access
    if (auth.user?.role !== 'super_admin') {
      const venueResult = await dynamodb.send(new GetItemCommand({
        TableName: TABLES.VENUES,
        Key: marshall({ venue_id: body.venue_id }),
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

    // Build update expression
    const updateExpressions: string[] = ['#updated_at = :updated_at'];
    const expressionAttributeNames: Record<string, string> = { '#updated_at': 'updated_at' };
    const expressionAttributeValues: Record<string, unknown> = { ':updated_at': Date.now() };

    if (body.beer_id !== undefined) {
      updateExpressions.push('beer_id = :beer_id');
      expressionAttributeValues[':beer_id'] = body.beer_id;
    }
    if (body.dispenser_number !== undefined) {
      updateExpressions.push('dispenser_number = :dispenser_number');
      expressionAttributeValues[':dispenser_number'] = body.dispenser_number;
    }
    if (body.position_description !== undefined) {
      updateExpressions.push('position_description = :position_description');
      expressionAttributeValues[':position_description'] = body.position_description;
    }
    if (body.price !== undefined) {
      updateExpressions.push('price = :price');
      expressionAttributeValues[':price'] = body.price;
    }
    if (body.volume_ml !== undefined) {
      updateExpressions.push('volume_ml = :volume_ml');
      expressionAttributeValues[':volume_ml'] = body.volume_ml;
    }
    if (body.is_active !== undefined) {
      updateExpressions.push('is_active = :is_active');
      expressionAttributeValues[':is_active'] = body.is_active;
    }

    const result = await dynamodb.send(new UpdateItemCommand({
      TableName: TABLES.VENUE_DISPENSERS,
      Key: marshall({ venue_id: body.venue_id, dispenser_id: body.dispenser_id }),
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ReturnValues: 'ALL_NEW',
    }));

    const venueDispenser = unmarshall(result.Attributes!) as VenueDispenser;

    return NextResponse.json({ venue_dispenser: venueDispenser });
  } catch (error) {
    console.error('Update venue dispenser error:', error);
    return NextResponse.json(
      { error: 'Failed to update venue dispenser mapping' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/venue-dispensers?venue_id=xxx&dispenser_id=yyy
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, 'venue_owner');
  if (auth instanceof NextResponse) return auth;

  const venueId = req.nextUrl.searchParams.get('venue_id');
  const dispenserId = req.nextUrl.searchParams.get('dispenser_id');

  if (!venueId || !dispenserId) {
    return NextResponse.json(
      { error: 'venue_id and dispenser_id query parameters are required' },
      { status: 400 }
    );
  }

  try {
    // Check venue access
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

    await dynamodb.send(new DeleteItemCommand({
      TableName: TABLES.VENUE_DISPENSERS,
      Key: marshall({ venue_id: venueId, dispenser_id: dispenserId }),
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete venue dispenser error:', error);
    return NextResponse.json(
      { error: 'Failed to delete venue dispenser mapping' },
      { status: 500 }
    );
  }
}
