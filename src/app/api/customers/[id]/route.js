import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { authenticateRequest } from '@/lib/serverAuth';

export async function PUT(request, { params }) {
  try {
    const { errorResponse } = await authenticateRequest(request, ['admin', 'manager']);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const body = await request.json();
    const collection = await getCollection('customers');

    // Case 1: Recording a payment received against customer's khata
    if (body.paymentAmount !== undefined) {
      const payment = parseFloat(body.paymentAmount) || 0;
      if (payment <= 0) {
        return NextResponse.json({ error: 'Payment amount must be greater than zero' }, { status: 400 });
      }

      const customer = await collection.findOne({ _id: new ObjectId(id) });
      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      const updatedBalance = Math.round(Math.max(0, (customer.currentBalance || 0) - payment) * 100) / 100;

      // Log transaction in customerPayments collection
      const paymentsCollection = await getCollection('customerPayments');
      await paymentsCollection.insertOne({
        customerId: new ObjectId(id),
        customerName: customer.name,
        amount: payment,
        previousBalance: customer.currentBalance || 0,
        newBalance: updatedBalance,
        paymentMode: body.paymentMode || 'Cash',
        notes: body.notes || 'Khata payment',
        createdAt: new Date(),
      });

      const updated = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { currentBalance: updatedBalance, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      return NextResponse.json(updated);
    }

    // Case 2: General update of customer information
    const updateData = { updatedAt: new Date() };
    if (body.name) updateData.name = body.name.trim();
    if (body.phone !== undefined) updateData.phone = body.phone.trim();
    if (body.vehicleNumber !== undefined) updateData.vehicleNumber = body.vehicleNumber.trim().toUpperCase();
    if (body.creditLimit !== undefined) updateData.creditLimit = parseFloat(body.creditLimit) || 0;

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
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
    const collection = await getCollection('customers');

    // Soft delete
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { active: false, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
