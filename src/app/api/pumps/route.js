import { NextResponse } from 'next/server';
import { getCollection, seedPumps } from '@/lib/db';

export async function GET() {
  try {
    await seedPumps();
    const collection = await getCollection('pumps');
    const pumps = await collection.find({}).sort({ pumpNumber: 1 }).toArray();
    return NextResponse.json(pumps);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
