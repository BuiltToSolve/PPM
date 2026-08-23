import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';

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
    const body = await request.json();
    const { name, category, stock, price } = body;

    if (!name || category === undefined || stock === undefined || price === undefined) {
      return NextResponse.json({ error: 'Name, category, stock, and price are required' }, { status: 400 });
    }

    const collection = await getCollection('inventory');
    
    const newItem = {
      name,
      category,
      stock: parseInt(stock, 10),
      price: parseFloat(price),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(newItem);
    
    if (result.acknowledged) {
      return NextResponse.json({ ...newItem, _id: result.insertedId }, { status: 201 });
    } else {
      throw new Error('Failed to insert item');
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
