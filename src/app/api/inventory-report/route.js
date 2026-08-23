import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const collection = await getCollection('dailySales');
    const sales = await collection
      .find({ date: { $gte: startDate, $lte: endDate }, saleType: 'inventory' })
      .sort({ date: 1, createdAt: 1 })
      .toArray();

    let grandTotal = 0;
    let grandCash = 0;
    let grandDigital = 0;
    let grandHp = 0;
    let grandDebt = 0;
    let grandUnsettledDebt = 0;
    let grandExtraIncome = 0;
    const itemBreakdown = {};
    const debtSales = [];

    sales.forEach((sale) => {
      grandTotal += sale.totalAmount || 0;
      grandCash += sale.cashAmount || 0;
      grandDigital += sale.digitalAmount || 0;
      grandHp += sale.hpAmount || 0;
      grandExtraIncome += sale.extraIncome || 0;

      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          if (!itemBreakdown[item.name]) {
            itemBreakdown[item.name] = { qty: 0, amount: 0, rate: item.rate || 0 };
          }
          itemBreakdown[item.name].qty += item.quantity || 0;
          itemBreakdown[item.name].amount += item.totalAmount || 0;
          itemBreakdown[item.name].rate = item.rate || itemBreakdown[item.name].rate;
        });
      }

      const saleDebt = sale.debtAmount || 0;
      if (saleDebt > 0) {
        grandDebt += saleDebt;
        debtSales.push({
          _id: sale._id,
          operatorName: sale.operatorName,
          itemsStr: sale.items ? sale.items.map(i => i.name).join(', ') : 'Items',
          totalAmount: sale.totalAmount,
          debtAmount: saleDebt,
          debtSettled: sale.debtSettled || false,
          debtEntries: sale.debtEntries || [],
        });
        if (!sale.debtSettled) {
          if (sale.debtEntries && sale.debtEntries.length > 0) {
            grandUnsettledDebt += sale.debtEntries.reduce((acc, e) => !e.settled ? acc + (e.amount || 0) : acc, 0);
          } else {
            grandUnsettledDebt += saleDebt;
          }
        }
      }
    });

    return NextResponse.json({
      startDate,
      endDate,
      totalEntries: sales.length,
      grandTotal: Math.round(grandTotal * 100) / 100,
      grandCash: Math.round(grandCash * 100) / 100,
      grandDigital: Math.round(grandDigital * 100) / 100,
      grandHp: Math.round(grandHp * 100) / 100,
      grandDebt: Math.round(grandDebt * 100) / 100,
      grandUnsettledDebt: Math.round(grandUnsettledDebt * 100) / 100,
      grandExtraIncome: Math.round(grandExtraIncome * 100) / 100,
      itemBreakdown,
      debtSales,
      sales,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
