import { NextResponse } from 'next/server';
import { getCollection, ensureIndexes } from '@/lib/db';
import { authenticateRequest } from '@/lib/serverAuth';

export async function GET(request) {
  try {
    ensureIndexes().catch(() => {});
    const collection = await getCollection('customers');
    const customers = await collection.find({ active: { $ne: false } }).sort({ name: 1 }).toArray();
    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { errorResponse } = await authenticateRequest(request, ['admin', 'manager']);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { name, phone = '', vehicleNumber = '', creditLimit = 50000 } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    const collection = await getCollection('customers');
    const existing = await collection.findOne({ name: name.trim() });
    if (existing && existing.active !== false) {
      return NextResponse.json({ error: 'Customer with this name already exists' }, { status: 400 });
    }

    const newCustomer = {
      name: name.trim(),
      phone: phone.trim(),
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      creditLimit: parseFloat(creditLimit) || 0,
      currentBalance: 0,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newCustomer);
    return NextResponse.json({ ...newCustomer, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
