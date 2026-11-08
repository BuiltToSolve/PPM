import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { authenticateRequest } from '@/lib/serverAuth';

export async function PUT(request, { params }) {
  try {
    const { errorResponse } = await authenticateRequest(request, ['admin']);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const body = await request.json();
    const { name, fuelTypes, status } = body;

    const updateData = { updatedAt: new Date() };
    if (name) updateData.name = name.trim();
    if (Array.isArray(fuelTypes)) updateData.fuelTypes = fuelTypes;
    if (status) updateData.status = status;

    const collection = await getCollection('pumps');
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Pump not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { errorResponse } = await authenticateRequest(request, ['admin']);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const collection = await getCollection('pumps');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Pump not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
