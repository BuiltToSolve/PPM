import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const collection = await getCollection('dailySales');
    let filter = {};

    if (date) {
      // Filter by date string (YYYY-MM-DD)
      filter.date = date;
    }

    const sales = await collection.find(filter).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      date,
      operatorId,
      operatorName,
      pumpNumber,
      fuelType,
      openingReading,
      closingReading,
      testingQty,
      rate,
      cashAmount,
      digitalAmount,
    } = body;

    // Validation
    if (!date || !operatorId || !pumpNumber || !fuelType) {
      return NextResponse.json(
        { error: 'Date, operator, pump and fuel type are required' },
        { status: 400 }
      );
    }

    const opening = parseFloat(openingReading) || 0;
    const closing = parseFloat(closingReading) || 0;
    const testing = parseFloat(testingQty) || 0;
    const fuelRate = parseFloat(rate) || 0;
    const cash = parseFloat(cashAmount) || 0;
    const digital = parseFloat(digitalAmount) || 0;

    const totalQty = closing - opening;
    const saleQty = totalQty - testing;
    const totalAmount = saleQty * fuelRate;
    const roundedTotal = Math.round(totalAmount * 100) / 100;
    const debtAmount = Math.round((roundedTotal - cash - digital) * 100) / 100;

    const sale = {
      date,
      operatorId,
      operatorName,
      pumpNumber: parseInt(pumpNumber),
      fuelType,
      openingReading: opening,
      closingReading: closing,
      totalQty,
      testingQty: testing,
      saleQty,
      rate: fuelRate,
      totalAmount: roundedTotal,
      cashAmount: cash,
      digitalAmount: digital,
      debtAmount: debtAmount > 0 ? debtAmount : 0,
      debtSettled: debtAmount <= 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const collection = await getCollection('dailySales');
    const result = await collection.insertOne(sale);

    return NextResponse.json({ ...sale, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
