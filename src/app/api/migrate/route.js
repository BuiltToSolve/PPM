import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';

export async function GET() {
  try {
    const collection = await getCollection('dailySales');
    const sales = await collection.find({}).toArray();

    // Group by date, operator, and pump
    const groupedSales = {};

    for (const sale of sales) {
      if (sale.fuels) {
        // Already migrated
        continue;
      }

      const key = `${sale.date}_${sale.operatorId}_${sale.pumpNumber}`;
      if (!groupedSales[key]) {
        groupedSales[key] = {
          date: sale.date,
          operatorId: sale.operatorId,
          operatorName: sale.operatorName,
          pumpNumber: sale.pumpNumber,
          fuels: [],
          cashAmount: 0,
          digitalAmount: 0,
          totalAmount: 0,
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
          oldIds: []
        };
      }

      const group = groupedSales[key];
      group.fuels.push({
        fuelType: sale.fuelType,
        openingReading: sale.openingReading,
        closingReading: sale.closingReading,
        testingQty: sale.testingQty,
        saleQty: sale.saleQty,
        rate: sale.rate,
        totalQty: sale.totalQty,
        totalAmount: sale.totalAmount
      });
      group.cashAmount += (sale.cashAmount || 0);
      group.digitalAmount += (sale.digitalAmount || 0);
      group.totalAmount += (sale.totalAmount || 0);
      group.oldIds.push(sale._id);
    }

    // Now insert grouped and delete old
    for (const key of Object.keys(groupedSales)) {
      const group = groupedSales[key];
      
      const roundedTotal = Math.round(group.totalAmount * 100) / 100;
      const cash = Math.round(group.cashAmount * 100) / 100;
      const digital = Math.round(group.digitalAmount * 100) / 100;
      const debtAmount = Math.round((roundedTotal - cash - digital) * 100) / 100;

      const newSale = {
        date: group.date,
        operatorId: group.operatorId,
        operatorName: group.operatorName,
        pumpNumber: group.pumpNumber,
        fuels: group.fuels,
        totalAmount: roundedTotal,
        cashAmount: cash,
        digitalAmount: digital,
        debtAmount: debtAmount > 0 ? debtAmount : 0,
        debtSettled: debtAmount <= 0,
        createdAt: group.createdAt,
        updatedAt: new Date()
      };

      await collection.insertOne(newSale);
      for (const id of group.oldIds) {
        await collection.deleteOne({ _id: id });
      }
    }

    return NextResponse.json({ message: `Migrated ${Object.keys(groupedSales).length} grouped sales.` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
