import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function PUT(request, { params }) {
  try {
    const role = request.headers.get('x-user-role');
    if (role === 'manager') {
      return NextResponse.json({ error: 'Managers cannot edit sales' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const collection = await getCollection('dailySales');

    const updateData = { ...body, updatedAt: new Date() };
    delete updateData._id;

    // Handle debt settle action
    if (body.debtSettled !== undefined && Object.keys(body).length <= 2) {
      // Only updating debtSettled status
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { debtSettled: body.debtSettled, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      if (!result) {
        return NextResponse.json({ error: 'Sale entry not found' }, { status: 404 });
      }

      return NextResponse.json(result);
    }

    // Recalculate if readings changed
    if (body.openingReading !== undefined || body.closingReading !== undefined) {
      const opening = parseFloat(body.openingReading) || 0;
      const closing = parseFloat(body.closingReading) || 0;
      const testing = parseFloat(body.testingQty) || 0;
      const fuelRate = parseFloat(body.rate) || 0;

      updateData.openingReading = opening;
      updateData.closingReading = closing;
      updateData.testingQty = testing;
      updateData.rate = fuelRate;
      updateData.totalQty = closing - opening;
      updateData.saleQty = updateData.totalQty - testing;
      updateData.totalAmount = Math.round(updateData.saleQty * fuelRate * 100) / 100;
      updateData.cashAmount = parseFloat(body.cashAmount) || 0;
      updateData.digitalAmount = parseFloat(body.digitalAmount) || 0;

      // Recalculate debt
      const debtAmount = Math.round((updateData.totalAmount - updateData.cashAmount - updateData.digitalAmount) * 100) / 100;
      updateData.debtAmount = debtAmount > 0 ? debtAmount : 0;
      updateData.debtSettled = debtAmount <= 0;
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Sale entry not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const role = request.headers.get('x-user-role');
    if (role === 'manager') {
      return NextResponse.json({ error: 'Managers cannot delete sales' }, { status: 403 });
    }

    const { id } = await params;
    const collection = await getCollection('dailySales');

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Sale entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
