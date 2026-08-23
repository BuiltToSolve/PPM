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
      saleType = 'fuel', // 'fuel' or 'inventory'
      date,
      operatorId,
      operatorName,
      pumpNumber,
      fuels,
      items, // array of { inventoryId, name, quantity, rate }
      cashAmount,
      digitalAmount,
      hpAmount,
    } = body;

    // Validation
    if (!date || !operatorId) {
      return NextResponse.json(
        { error: 'Date and operator are required' },
        { status: 400 }
      );
    }

    if (saleType === 'fuel' && (!pumpNumber || !fuels || !Array.isArray(fuels) || fuels.length === 0)) {
      return NextResponse.json(
        { error: 'Pump and fuels data are required for fuel sales' },
        { status: 400 }
      );
    }

    if (saleType === 'inventory' && (!items || !Array.isArray(items) || items.length === 0)) {
      return NextResponse.json(
        { error: 'Items data is required for inventory sales' },
        { status: 400 }
      );
    }

    let grandTotalAmount = 0;
    let processedFuels = [];
    let processedItems = [];

    if (saleType === 'fuel') {
      processedFuels = fuels.map(f => {
        const opening = parseFloat(f.openingReading) || 0;
        const closing = parseFloat(f.closingReading) || 0;
        const testing = parseFloat(f.testingQty) || 0;
        const fuelRate = parseFloat(f.rate) || 0;

        const totalQty = closing - opening;
        const saleQty = totalQty - testing;
        const totalAmount = saleQty * fuelRate;
        const roundedTotal = Math.round(totalAmount * 100) / 100;
        
        grandTotalAmount += roundedTotal;

        return {
          fuelType: f.fuelType,
          openingReading: opening,
          closingReading: closing,
          totalQty,
          testingQty: testing,
          saleQty,
          rate: fuelRate,
          totalAmount: roundedTotal,
        };
      });
    } else if (saleType === 'inventory') {
      const inventoryCollection = await getCollection('inventory');
      
      for (const item of items) {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const totalAmount = qty * rate;
        const roundedTotal = Math.round(totalAmount * 100) / 100;
        
        grandTotalAmount += roundedTotal;

        processedItems.push({
          inventoryId: item.inventoryId,
          name: item.name,
          quantity: qty,
          rate,
          totalAmount: roundedTotal
        });

        // Deduct inventory
        if (item.inventoryId) {
          await inventoryCollection.updateOne(
            { _id: new ObjectId(item.inventoryId) },
            { $inc: { stock: -qty } }
          );
        }
      }
    }

    let expensesTotal = 0;
    const finalExpenses = [];
    if (Array.isArray(body.expenses)) {
      body.expenses.forEach(exp => {
        const amt = parseFloat(exp.amount) || 0;
        if (amt > 0 && exp.description) {
          expensesTotal += amt;
          finalExpenses.push({ description: exp.description, amount: amt });
        }
      });
    }

    const cash = parseFloat(cashAmount) || 0;
    const digital = parseFloat(digitalAmount) || 0;
    const hp = parseFloat(hpAmount) || 0;
    const roundedGrandTotal = Math.round(grandTotalAmount * 100) / 100;
    
    const netExpected = roundedGrandTotal - expensesTotal;
    const rawDiff = Math.round((netExpected - cash - digital - hp) * 100) / 100;

    let debtAmount = 0;
    let extraIncome = 0;
    let finalDebtEntries = [];

    if (rawDiff > 0) {
      debtAmount = rawDiff;
      const inputDebtEntries = Array.isArray(body.debtEntries) ? body.debtEntries : [];
      let sumOfDebts = 0;
      inputDebtEntries.forEach(entry => {
        const amt = parseFloat(entry.amount) || 0;
        if (amt > 0) {
          sumOfDebts += amt;
          finalDebtEntries.push({
            clientName: entry.clientName || 'Unknown',
            amount: amt,
            settled: false
          });
        }
      });
      const remainingDebt = Math.round((debtAmount - sumOfDebts) * 100) / 100;
      if (remainingDebt > 0) {
        finalDebtEntries.push({
          clientName: operatorName,
          amount: remainingDebt,
          settled: false
        });
      }
    } else if (rawDiff < 0) {
      extraIncome = Math.abs(rawDiff);
    }

    const sale = {
      saleType,
      date,
      operatorId,
      operatorName,
      totalAmount: roundedGrandTotal,
      expenses: finalExpenses,
      expensesTotal,
      cashAmount: cash,
      digitalAmount: digital,
      hpAmount: hp,
      debtAmount,
      extraIncome,
      debtEntries: finalDebtEntries,
      debtSettled: debtAmount <= 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (saleType === 'fuel') {
      sale.pumpNumber = parseInt(pumpNumber);
      sale.fuels = processedFuels;
    } else {
      sale.items = processedItems;
    }

    const collection = await getCollection('dailySales');
    const result = await collection.insertOne(sale);

    return NextResponse.json({ ...sale, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
