import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    // Default to today in IST
    const today = date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const collection = await getCollection('dailySales');

    // Today's sales
    const todaySales = await collection.find({ date: today }).toArray();

    // Aggregate stats
    let totalAmount = 0;
    let totalCash = 0;
    let totalDigital = 0;
    let totalDebt = 0;
    let unsettledDebt = 0;
    const fuelWise = {};
    const operatorWise = {};

    todaySales.forEach((sale) => {
      totalAmount += sale.totalAmount || 0;
      totalCash += sale.cashAmount || 0;
      totalDigital += sale.digitalAmount || 0;

      // Fuel-wise
      if (sale.fuels && Array.isArray(sale.fuels)) {
        sale.fuels.forEach((fuel) => {
          if (!fuelWise[fuel.fuelType]) {
            fuelWise[fuel.fuelType] = { qty: 0, amount: 0 };
          }
          fuelWise[fuel.fuelType].qty += fuel.saleQty || 0;
          fuelWise[fuel.fuelType].amount += fuel.totalAmount || 0;
        });
      } else if (sale.fuelType) {
        // Fallback for non-migrated
        if (!fuelWise[sale.fuelType]) {
          fuelWise[sale.fuelType] = { qty: 0, amount: 0 };
        }
        fuelWise[sale.fuelType].qty += sale.saleQty || 0;
        fuelWise[sale.fuelType].amount += sale.totalAmount || 0;
      }

      // Operator-wise
      if (!operatorWise[sale.operatorName]) {
        operatorWise[sale.operatorName] = { amount: 0, cash: 0, digital: 0 };
      }
      operatorWise[sale.operatorName].amount += sale.totalAmount || 0;
      operatorWise[sale.operatorName].cash += sale.cashAmount || 0;
      operatorWise[sale.operatorName].digital += sale.digitalAmount || 0;

      // Debt tracking
      const saleDebt = sale.debtAmount || 0;
      if (saleDebt > 0) {
        totalDebt += saleDebt;
        if (!sale.debtSettled) {
          unsettledDebt += saleDebt;
        }
      }
    });

    return NextResponse.json({
      date: today,
      totalEntries: todaySales.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalCash: Math.round(totalCash * 100) / 100,
      totalDigital: Math.round(totalDigital * 100) / 100,
      totalDebt: Math.round(totalDebt * 100) / 100,
      unsettledDebt: Math.round(unsettledDebt * 100) / 100,
      fuelWise,
      operatorWise,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
