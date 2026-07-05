import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 });
    }

    const collection = await getCollection('dailySales');
    const sales = await collection
      .find({ date })
      .sort({ createdAt: 1 })
      .toArray();

    let grandTotal = 0;
    let grandCash = 0;
    let grandDigital = 0;
    let grandQty = 0;
    let grandDebt = 0;
    let grandUnsettledDebt = 0;
    const fuelBreakdown = {};
    const debtSales = [];

    sales.forEach((sale) => {
      grandTotal += sale.totalAmount || 0;
      grandCash += sale.cashAmount || 0;
      grandDigital += sale.digitalAmount || 0;
      grandQty += sale.saleQty || 0;

      if (!fuelBreakdown[sale.fuelType]) {
        fuelBreakdown[sale.fuelType] = { qty: 0, amount: 0, rate: sale.rate || 0 };
      }
      fuelBreakdown[sale.fuelType].qty += sale.saleQty || 0;
      fuelBreakdown[sale.fuelType].amount += sale.totalAmount || 0;
      fuelBreakdown[sale.fuelType].rate = sale.rate || fuelBreakdown[sale.fuelType].rate;

      const saleDebt = sale.debtAmount || 0;
      if (saleDebt > 0) {
        grandDebt += saleDebt;
        debtSales.push({
          _id: sale._id,
          operatorName: sale.operatorName,
          pumpNumber: sale.pumpNumber,
          fuelType: sale.fuelType,
          totalAmount: sale.totalAmount,
          debtAmount: saleDebt,
          debtSettled: sale.debtSettled || false,
        });
        if (!sale.debtSettled) {
          grandUnsettledDebt += saleDebt;
        }
      }
    });

    return NextResponse.json({
      date,
      totalEntries: sales.length,
      grandTotal: Math.round(grandTotal * 100) / 100,
      grandCash: Math.round(grandCash * 100) / 100,
      grandDigital: Math.round(grandDigital * 100) / 100,
      grandQty: Math.round(grandQty * 100) / 100,
      grandDebt: Math.round(grandDebt * 100) / 100,
      grandUnsettledDebt: Math.round(grandUnsettledDebt * 100) / 100,
      fuelBreakdown,
      debtSales,
      sales,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
