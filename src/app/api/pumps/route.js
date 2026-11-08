import { NextResponse } from 'next/server';
import { getCollection, seedPumps } from '@/lib/db';
import { authenticateRequest } from '@/lib/serverAuth';

export async function GET(request) {
  try {
    await seedPumps();
    const { searchParams } = new URL(request.url);
    const pumpNumber = searchParams.get('pumpNumber');

    const collection = await getCollection('pumps');

    // If query requests last readings for a specific pump
    if (pumpNumber) {
      const salesCollection = await getCollection('dailySales');
      const lastSale = await salesCollection
        .find({ pumpNumber: parseInt(pumpNumber), saleType: 'fuel' })
        .sort({ date: -1, createdAt: -1 })
        .limit(1)
        .toArray();

      const lastReadings = {};
      if (lastSale.length > 0 && Array.isArray(lastSale[0].fuels)) {
        lastSale[0].fuels.forEach((f) => {
          lastReadings[f.fuelType] = f.closingReading;
        });
      }
      return NextResponse.json({ lastReadings, lastSaleDate: lastSale[0]?.date || null });
    }

    const pumps = await collection.find({}).sort({ pumpNumber: 1 }).toArray();
    return NextResponse.json(pumps);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { errorResponse } = await authenticateRequest(request, ['admin']);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { pumpNumber, name, fuelTypes } = body;

    if (!pumpNumber || !name || !fuelTypes || !Array.isArray(fuelTypes) || fuelTypes.length === 0) {
      return NextResponse.json(
        { error: 'Pump number, name, and at least one fuel type are required' },
        { status: 400 }
      );
    }

    const collection = await getCollection('pumps');
    const existing = await collection.findOne({ pumpNumber: parseInt(pumpNumber) });
    if (existing) {
      return NextResponse.json(
        { error: `Pump #${pumpNumber} already exists` },
        { status: 400 }
      );
    }

    const newPump = {
      pumpNumber: parseInt(pumpNumber),
      name: name.trim(),
      fuelTypes,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newPump);
    return NextResponse.json({ ...newPump, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
