import { NextResponse } from 'next/server';
import { getCollection, seedFuelRates } from '@/lib/db';

export async function GET() {
  try {
    await seedFuelRates();
    const collection = await getCollection('fuelRates');
    const rates = await collection.find({}).sort({ fuelType: 1 }).toArray();
    return NextResponse.json(rates);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { fuelType, rate } = body;

    if (!fuelType || rate === undefined) {
      return NextResponse.json({ error: 'Fuel type and rate are required' }, { status: 400 });
    }

    const collection = await getCollection('fuelRates');

    // Upsert - update if exists, insert if not
    const result = await collection.findOneAndUpdate(
      { fuelType },
      { $set: { rate: parseFloat(rate), updatedAt: new Date() } },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
