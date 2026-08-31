import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    const collection = await getCollection('dailySales');

    let query = { debtAmount: { $gt: 0 } };
    if (status === 'unsettled') {
      query.debtSettled = { $ne: true };
    } else if (status === 'settled') {
      query.debtSettled = true;
    }

    const debts = await collection
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .toArray();

    return NextResponse.json(debts);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
