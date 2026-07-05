import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function PUT(request, { params }) {
  try {
    const role = request.headers.get('x-user-role');
    if (role === 'manager') {
      return NextResponse.json({ error: 'Managers cannot change fuel rates' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { rate } = body;

    if (rate === undefined) {
      return NextResponse.json({ error: 'Rate is required' }, { status: 400 });
    }

    const collection = await getCollection('fuelRates');
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { rate: parseFloat(rate), updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Fuel rate not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
