import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { inventoryItemSchema } from '@/lib/validations';
import { authenticateRequest } from '@/lib/serverAuth';

export async function GET() {
  try {
    const collection = await getCollection('inventory');
    const items = await collection.find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { errorResponse } = await authenticateRequest(request, ['admin', 'manager']);
    if (errorResponse) return errorResponse;

    const rawBody = await request.json();
    const result = inventoryItemSchema.safeParse(rawBody);

    if (!result.success) {
      const firstError = result.error.errors[0];
      return NextResponse.json(
        { error: `${firstError.path.join('.')}: ${firstError.message}` },
        { status: 400 }
      );
    }

    const { name, category, stock, price } = result.data;
    const collection = await getCollection('inventory');
    
    const newItem = {
      name,
      category,
      stock: Math.round(stock * 100) / 100,
      price: Math.round(price * 100) / 100,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const insertResult = await collection.insertOne(newItem);
    return NextResponse.json({ ...newItem, _id: insertResult.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
