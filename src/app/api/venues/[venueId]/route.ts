import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand, QueryCommand, BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { Venue, VenueDispenser, Beer } from '@/lib/tables';

type RouteContext = { params: Promise<{ venueId: string }> };

// GET /api/venues/[venueId] - Get venue info with available beers (public for customers)
export async function GET(req: NextRequest, context: RouteContext) {
  const { venueId } = await context.params;
  const dispenserId = req.nextUrl.searchParams.get('dispenser');

  try {
    // Get venue details
    const venueResult = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.VENUES,
      Key: marshall({ venue_id: venueId }),
    }));

    if (!venueResult.Item) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }

    const venue = unmarshall(venueResult.Item) as Venue;

    if (!venue.is_active) {
      return NextResponse.json(
        { error: 'Venue is not active' },
        { status: 404 }
      );
    }

    // Get venue dispensers
    let venueDispensers: VenueDispenser[];

    if (dispenserId) {
      // Specific dispenser requested (scenario B)
      const vdResult = await dynamodb.send(new GetItemCommand({
        TableName: TABLES.VENUE_DISPENSERS,
        Key: marshall({ venue_id: venueId, dispenser_id: dispenserId }),
      }));

      if (!vdResult.Item) {
        return NextResponse.json(
          { error: 'Dispenser not found in this venue' },
          { status: 404 }
        );
      }

      const vd = unmarshall(vdResult.Item) as VenueDispenser;
      if (!vd.is_active) {
        return NextResponse.json(
          { error: 'Dispenser is not active' },
          { status: 404 }
        );
      }

      venueDispensers = [vd];
    } else {
      // All dispensers (scenario A)
      const vdResult = await dynamodb.send(new QueryCommand({
        TableName: TABLES.VENUE_DISPENSERS,
        KeyConditionExpression: 'venue_id = :venue_id',
        FilterExpression: 'is_active = :is_active',
        ExpressionAttributeValues: marshall({
          ':venue_id': venueId,
          ':is_active': true,
        }),
      }));

      venueDispensers = (vdResult.Items || []).map(item => unmarshall(item) as VenueDispenser);
    }

    // Get beer details
    const beerIds = [...new Set(venueDispensers.map(vd => vd.beer_id).filter(Boolean))];
    const beers = new Map<string, Beer>();

    if (beerIds.length > 0) {
      const beerResult = await dynamodb.send(new BatchGetItemCommand({
        RequestItems: {
          [TABLES.BEERS]: {
            Keys: beerIds.map(id => marshall({ beer_id: id })),
          },
        },
      }));

      (beerResult.Responses?.[TABLES.BEERS] || []).forEach(item => {
        const beer = unmarshall(item) as Beer;
        if (beer.is_active) {
          beers.set(beer.beer_id, beer);
        }
      });
    }

    // Build response
    const dispensers = venueDispensers
      .filter(vd => beers.has(vd.beer_id))
      .map(vd => ({
        dispenser_id: vd.dispenser_id,
        dispenser_number: vd.dispenser_number,
        position_description: vd.position_description,
        price: vd.price,
        volume_ml: vd.volume_ml,
        beer: {
          beer_id: beers.get(vd.beer_id)!.beer_id,
          name: beers.get(vd.beer_id)!.name,
          brand: beers.get(vd.beer_id)!.brand,
          style: beers.get(vd.beer_id)!.style,
          abv: beers.get(vd.beer_id)!.abv,
          description: beers.get(vd.beer_id)!.description,
          image_url: beers.get(vd.beer_id)!.image_url,
        },
      }))
      .sort((a, b) => a.dispenser_number - b.dispenser_number);

    return NextResponse.json({
      venue: {
        venue_id: venue.venue_id,
        name: venue.name,
        address: venue.address,
      },
      dispensers,
      // If specific dispenser requested, include direct access info
      ...(dispenserId && dispensers.length === 1 ? {
        selected_dispenser: dispensers[0],
      } : {}),
    });
  } catch (error) {
    console.error('Get venue error:', error);
    return NextResponse.json(
      { error: 'Failed to get venue info' },
      { status: 500 }
    );
  }
}
