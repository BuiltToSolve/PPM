import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { authenticateRequest } from '@/lib/serverAuth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const collection = await getCollection('tankDipLogs');
    const filter = date ? { date } : {};
    const logs = await collection.find(filter).sort({ date: -1, createdAt: -1 }).toArray();

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { errorResponse } = await authenticateRequest(request, ['admin', 'manager']);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { tankId, tankNumber, fuelType, date, shift = 'Morning', dipCm, physicalStockLiters, waterDipCm = 0, testedReturnQty = 0 } = body;

    if (!tankId || !date || dipCm === undefined || physicalStockLiters === undefined) {
      return NextResponse.json(
        { error: 'Tank, date, dip (cm), and physical stock (L) are required' },
        { status: 400 }
      );
    }

    const tanksCollection = await getCollection('tanks');
    const tank = await tanksCollection.findOne({ _id: new ObjectId(tankId) });
    if (!tank) {
      return NextResponse.json({ error: 'Tank not found' }, { status: 404 });
    }

    const previousStock = tank.currentStockLiters || 0;
    const currentPhysical = parseFloat(physicalStockLiters) || 0;
    const difference = Math.round((currentPhysical - previousStock) * 100) / 100;

    const dipLog = {
      tankId: new ObjectId(tankId),
      tankNumber: tankNumber || tank.tankNumber,
      fuelType: fuelType || tank.fuelType,
      date,
      shift,
      dipCm: parseFloat(dipCm),
      waterDipCm: parseFloat(waterDipCm) || 0,
      physicalStockLiters: currentPhysical,
      previousStockLiters: previousStock,
      varianceLiters: difference, // positive = gain, negative = loss/sales
      testedReturnQty: parseFloat(testedReturnQty) || 0,
      createdAt: new Date(),
    };

    const dipLogsCollection = await getCollection('tankDipLogs');
    const result = await dipLogsCollection.insertOne(dipLog);

    // Update current tank stock in tanks collection
    await tanksCollection.updateOne(
      { _id: new ObjectId(tankId) },
      { $set: { currentStockLiters: currentPhysical, lastDipCm: parseFloat(dipCm), updatedAt: new Date() } }
    );

    return NextResponse.json({ ...dipLog, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
