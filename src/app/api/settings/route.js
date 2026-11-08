import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { authenticateRequest } from '@/lib/serverAuth';

export async function GET() {
  try {
    const collection = await getCollection('settings');
    let settings = await collection.findOne({ type: 'station_profile' });

    if (!settings) {
      settings = {
        type: 'station_profile',
        stationName: 'Samrat Energy',
        address: 'National Highway, Forecourt',
        gstin: '',
        contactPhone: '',
        updatedAt: new Date(),
      };
      await collection.insertOne(settings);
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { errorResponse } = await authenticateRequest(request, ['admin']);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { stationName, address, gstin, contactPhone } = body;

    const collection = await getCollection('settings');
    const updateData = {
      updatedAt: new Date(),
    };
    if (stationName) updateData.stationName = stationName.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (gstin !== undefined) updateData.gstin = gstin.trim().toUpperCase();
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone.trim();

    const result = await collection.findOneAndUpdate(
      { type: 'station_profile' },
      { $set: updateData },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
