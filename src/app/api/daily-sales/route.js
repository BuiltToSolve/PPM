import { NextResponse } from 'next/server';
import { getCollection, ensureIndexes } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { dailySaleSchema } from '@/lib/validations';
import { authenticateRequest } from '@/lib/serverAuth';

export async function GET(request) {
  try {
    ensureIndexes().catch(() => {});
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const collection = await getCollection('dailySales');
    let filter = {};

    if (date) {
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
    const { errorResponse } = await authenticateRequest(request, ['admin', 'manager']);
    if (errorResponse) return errorResponse;

    const rawBody = await request.json();

    // 1. Validate payload with Zod
    const parseResult = dailySaleSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return NextResponse.json(
        { error: `${firstError.path.join('.')}: ${firstError.message}` },
        { status: 400 }
      );
    }

    const body = parseResult.data;
    const {
      saleType,
      date,
      operatorId,
      operatorName,
      pumpNumber,
      fuels,
      items,
      cashAmount = 0,
      digitalAmount = 0,
      hpAmount = 0,
    } = body;

    const collection = await getCollection('dailySales');

    // 2. Prevent rapid double-clicks (Duplicate Submission Protection)
    if (saleType === 'fuel' && pumpNumber) {
      const fifteenSecondsAgo = new Date(Date.now() - 15000);
      const duplicateRecent = await collection.findOne({
        date,
        pumpNumber: parseInt(pumpNumber),
        operatorId,
        saleType: 'fuel',
        createdAt: { $gte: fifteenSecondsAgo },
      });

      if (duplicateRecent) {
        return NextResponse.json(
          { error: 'A sale for this pump & operator was just recorded. Please refresh.' },
          { status: 409 }
        );
      }
    }

    let grandTotalAmount = 0;
    let processedFuels = [];
    let processedItems = [];

    if (saleType === 'fuel') {
      if (!pumpNumber || !fuels || fuels.length === 0) {
        return NextResponse.json(
          { error: 'Pump and fuels data are required for fuel sales' },
          { status: 400 }
        );
      }

      processedFuels = fuels.map((f) => {
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
      if (!items || items.length === 0) {
        return NextResponse.json(
          { error: 'At least one item is required for inventory sales' },
          { status: 400 }
        );
      }

      const inventoryCollection = await getCollection('inventory');

      // 3. Pre-check stock levels to prevent negative inventory
      for (const item of items) {
        const invItem = await inventoryCollection.findOne({ _id: new ObjectId(item.inventoryId) });
        if (!invItem) {
          return NextResponse.json(
            { error: `Inventory item "${item.name}" not found` },
            { status: 404 }
          );
        }
        if (invItem.stock < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for "${invItem.name}". Available: ${invItem.stock}, requested: ${item.quantity}` },
            { status: 400 }
          );
        }
      }

      // Deduct stock safely with conditional check
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
          totalAmount: roundedTotal,
        });

        await inventoryCollection.updateOne(
          { _id: new ObjectId(item.inventoryId), stock: { $gte: qty } },
          { $inc: { stock: -qty }, $set: { updatedAt: new Date() } }
        );
      }
    }

    let expensesTotal = 0;
    const finalExpenses = [];
    if (Array.isArray(body.expenses)) {
      body.expenses.forEach((exp) => {
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

    const inputDebtEntries = Array.isArray(body.debtEntries) ? body.debtEntries : [];
    let sumOfDebts = 0;
    const finalDebtEntries = [];

    inputDebtEntries.forEach((entry) => {
      const amt = parseFloat(entry.amount) || 0;
      if (amt > 0) {
        sumOfDebts += amt;
        finalDebtEntries.push({
          clientName: entry.clientName || 'Unknown',
          amount: amt,
          settled: false,
        });
      }
    });

    let debtAmount = 0;
    let extraIncome = 0;
    const pendingDebt = Math.round((rawDiff - sumOfDebts) * 100) / 100;

    if (pendingDebt > 0) {
      finalDebtEntries.push({
        clientName: operatorName,
        amount: pendingDebt,
        settled: false,
      });
      debtAmount = Math.round((sumOfDebts + pendingDebt) * 100) / 100;
    } else {
      extraIncome = Math.abs(pendingDebt);
      debtAmount = sumOfDebts;
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

    const result = await collection.insertOne(sale);

    // Sync debt entries with customer ledger if client exists in customer directory
    try {
      const customersCollection = await getCollection('customers');
      for (const entry of finalDebtEntries) {
        if (entry.amount > 0 && entry.clientName && entry.clientName !== operatorName) {
          await customersCollection.updateOne(
            { name: entry.clientName },
            { $inc: { currentBalance: entry.amount }, $set: { updatedAt: new Date() } }
          );
        }
      }
    } catch (err) {
      console.error('Error syncing customer balance:', err);
    }

    return NextResponse.json({ ...sale, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
