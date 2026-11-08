import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { operatorSchema } from '@/lib/validations';
import { authenticateRequest } from '@/lib/serverAuth';

export async function GET() {
  try {
    const collection = await getCollection('operators');
    const operators = await collection.find({}).sort({ name: 1 }).toArray();
    return NextResponse.json(operators);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { errorResponse } = await authenticateRequest(request, ['admin', 'manager']);
    if (errorResponse) return errorResponse;

    const rawBody = await request.json();
    const result = operatorSchema.safeParse(rawBody);

    if (!result.success) {
      const firstError = result.error.errors[0];
      return NextResponse.json(
        { error: `${firstError.path.join('.')}: ${firstError.message}` },
        { status: 400 }
      );
    }

    const { name, phone } = result.data;
    const collection = await getCollection('operators');
    const operator = {
      name: name.trim(),
      phone: phone?.trim() || '',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await collection.insertOne(operator);
    return NextResponse.json({ ...operator, _id: insertResult.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
