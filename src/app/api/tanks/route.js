import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { authenticateRequest } from '@/lib/serverAuth';

const DEFAULT_TANKS = [
  { tankNumber: 1, fuelType: 'Petrol', capacityLiters: 20000, currentStockLiters: 14500, active: true },
  { tankNumber: 2, fuelType: 'Diesel', capacityLiters: 25000, currentStockLiters: 18200, active: true },
  { tankNumber: 3, fuelType: 'Premium Petrol', capacityLiters: 10000, currentStockLiters: 6800, active: true },
];

export async function GET() {
  try {
    const collection = await getCollection('tanks');
    const count = await collection.countDocuments();
    if (count === 0) {
      await collection.insertMany(DEFAULT_TANKS.map(t => ({ ...t, createdAt: new Date() })));
    }

    const tanks = await collection.find({ active: { $ne: false } }).sort({ tankNumber: 1 }).toArray();
    return NextResponse.json(tanks);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { errorResponse } = await authenticateRequest(request, ['admin']);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { tankNumber, fuelType, capacityLiters, currentStockLiters = 0 } = body;

    if (!tankNumber || !fuelType || !capacityLiters) {
      return NextResponse.json({ error: 'Tank number, fuel type, and capacity are required' }, { status: 400 });
    }

    const collection = await getCollection('tanks');
    const newTank = {
      tankNumber: parseInt(tankNumber),
      fuelType: fuelType.trim(),
      capacityLiters: parseFloat(capacityLiters),
      currentStockLiters: parseFloat(currentStockLiters),
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newTank);
    return NextResponse.json({ ...newTank, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
