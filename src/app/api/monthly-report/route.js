import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required (YYYY-MM-DD)' }, { status: 400 });
    }

    const collection = await getCollection('dailySales');
    const sales = await collection
      .find({ date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1 })
      .toArray();

    let grandTotal = 0;
    let grandCash = 0;
    let grandDigital = 0;
    let grandHp = 0;
    let grandQty = 0;
    let grandDebt = 0;
    let grandUnsettledDebt = 0;
    let grandExtraIncome = 0;
    const fuelBreakdown = {};
    const dailyBreakdown = {};
    const cngSummary = { cash: 0, digital: 0, hp: 0, debt: 0, totalAmount: 0 };

    sales.forEach((sale) => {
      grandTotal += sale.totalAmount || 0;
      grandCash += sale.cashAmount || 0;
      grandDigital += sale.digitalAmount || 0;
      grandHp += sale.hpAmount || 0;
      grandExtraIncome += sale.extraIncome || 0;

      if (sale.pumpNumber === 5) {
        cngSummary.cash += sale.cashAmount || 0;
        cngSummary.digital += sale.digitalAmount || 0;
        cngSummary.hp += sale.hpAmount || 0;
        cngSummary.debt += sale.debtAmount || 0;
        cngSummary.totalAmount += sale.totalAmount || 0;
      }

      const saleDebt = sale.debtAmount || 0;
      let unsettledSaleDebt = 0;
      if (saleDebt > 0) {
        grandDebt += saleDebt;
        if (!sale.debtSettled) {
          if (sale.debtEntries && sale.debtEntries.length > 0) {
            unsettledSaleDebt = sale.debtEntries.reduce((acc, e) => !e.settled ? acc + (e.amount || 0) : acc, 0);
          } else {
            unsettledSaleDebt = saleDebt;
          }
        }
        grandUnsettledDebt += unsettledSaleDebt;
      }

      if (sale.fuels && Array.isArray(sale.fuels)) {
        sale.fuels.forEach((fuel) => {
          grandQty += fuel.saleQty || 0;
          if (!fuelBreakdown[fuel.fuelType]) {
            fuelBreakdown[fuel.fuelType] = { qty: 0, amount: 0 };
          }
          fuelBreakdown[fuel.fuelType].qty += fuel.saleQty || 0;
          fuelBreakdown[fuel.fuelType].amount += fuel.totalAmount || 0;
        });
      } else if (sale.fuelType) {
        grandQty += sale.saleQty || 0;
        if (!fuelBreakdown[sale.fuelType]) {
          fuelBreakdown[sale.fuelType] = { qty: 0, amount: 0 };
        }
        fuelBreakdown[sale.fuelType].qty += sale.saleQty || 0;
        fuelBreakdown[sale.fuelType].amount += sale.totalAmount || 0;
      }

      if (!dailyBreakdown[sale.date]) {
        dailyBreakdown[sale.date] = {
          date: sale.date,
          totalAmount: 0,
          cashAmount: 0,
          digitalAmount: 0,
          hpAmount: 0,
          debtAmount: 0,
          unsettledDebtAmount: 0,
          extraIncome: 0
        };
      }
      dailyBreakdown[sale.date].totalAmount += sale.totalAmount || 0;
      dailyBreakdown[sale.date].cashAmount += sale.cashAmount || 0;
      dailyBreakdown[sale.date].digitalAmount += sale.digitalAmount || 0;
      dailyBreakdown[sale.date].hpAmount += sale.hpAmount || 0;
      dailyBreakdown[sale.date].debtAmount += saleDebt;
      dailyBreakdown[sale.date].unsettledDebtAmount += unsettledSaleDebt;
      dailyBreakdown[sale.date].extraIncome += sale.extraIncome || 0;
    });

    const dailyStats = Object.values(dailyBreakdown).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      startDate,
      endDate,
      totalEntries: sales.length,
      daysRecorded: dailyStats.length,
      grandTotal: Math.round(grandTotal * 100) / 100,
      grandCash: Math.round(grandCash * 100) / 100,
      grandDigital: Math.round(grandDigital * 100) / 100,
      grandHp: Math.round(grandHp * 100) / 100,
      grandQty: Math.round(grandQty * 100) / 100,
      grandDebt: Math.round(grandDebt * 100) / 100,
      grandUnsettledDebt: Math.round(grandUnsettledDebt * 100) / 100,
      grandExtraIncome: Math.round(grandExtraIncome * 100) / 100,
      cngSummary,
      fuelBreakdown,
      dailyStats,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
