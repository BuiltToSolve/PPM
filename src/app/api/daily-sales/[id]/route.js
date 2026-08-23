import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function PUT(request, { params }) {
  try {
    const role = request.headers.get('x-user-role');
    if (role === 'manager') {
      return NextResponse.json({ error: 'Managers cannot edit sales' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const collection = await getCollection('dailySales');

    const updateData = { ...body, updatedAt: new Date() };
    delete updateData._id;

    // Handle debt settle action
    if (body.debtSettled !== undefined && Object.keys(body).length <= 2) {
      let setUpdates = { debtSettled: body.debtSettled, updatedAt: new Date() };

      if (body.debtSettled === true) {
        const sale = await collection.findOne({ _id: new ObjectId(id) });
        if (sale && sale.debtEntries && sale.debtEntries.length > 0) {
          setUpdates.debtEntries = sale.debtEntries.map(e => ({ ...e, settled: true }));
        }
      }

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: setUpdates },
        { returnDocument: 'after' }
      );

      if (!result) {
        return NextResponse.json({ error: 'Sale entry not found' }, { status: 404 });
      }

      return NextResponse.json(result);
    }

    // Handle individual debt entry settlement
    if (body.settleDebtEntryIndex !== undefined && Object.keys(body).length <= 2) {
      const sale = await collection.findOne({ _id: new ObjectId(id) });
      if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
      
      if (sale.debtEntries && sale.debtEntries[body.settleDebtEntryIndex]) {
        sale.debtEntries[body.settleDebtEntryIndex].settled = true;
        
        // Check if all are settled
        const allSettled = sale.debtEntries.every(e => e.settled);
        
        const result = await collection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: { debtEntries: sale.debtEntries, debtSettled: allSettled, updatedAt: new Date() } },
          { returnDocument: 'after' }
        );
        return NextResponse.json(result);
      }
      return NextResponse.json({ error: 'Debt entry not found' }, { status: 404 });
    }

    // Recalculate if readings or items changed
    if (body.fuels !== undefined || body.items !== undefined) {
      let grandTotalAmount = 0;
      const existingSale = await collection.findOne({ _id: new ObjectId(id) });
      const saleType = existingSale ? existingSale.saleType || 'fuel' : 'fuel';
      
      if (saleType === 'fuel' && body.fuels !== undefined) {
        const processedFuels = body.fuels.map(f => {
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
        updateData.fuels = processedFuels;
      } else if (saleType === 'inventory' && body.items !== undefined) {
        const inventoryCollection = await getCollection('inventory');
        
        // Restore previous stock
        if (existingSale.items) {
          for (const item of existingSale.items) {
            if (item.inventoryId) {
              await inventoryCollection.updateOne(
                { _id: new ObjectId(item.inventoryId) },
                { $inc: { stock: item.quantity } }
              );
            }
          }
        }

        const processedItems = [];
        for (const item of body.items) {
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

          // Deduct new stock
          if (item.inventoryId) {
            await inventoryCollection.updateOne(
              { _id: new ObjectId(item.inventoryId) },
              { $inc: { stock: -qty } }
            );
          }
        }
        updateData.items = processedItems;
      } else if (saleType === 'fuel') {
        // Did not update fuels but updating payment for fuel sale
        grandTotalAmount = existingSale.totalAmount;
      } else if (saleType === 'inventory') {
        // Did not update items but updating payment for inventory sale
        grandTotalAmount = existingSale.totalAmount;
      }

      updateData.totalAmount = Math.round(grandTotalAmount * 100) / 100;
      updateData.cashAmount = parseFloat(body.cashAmount) || 0;
      updateData.digitalAmount = parseFloat(body.digitalAmount) || 0;
      updateData.hpAmount = parseFloat(body.hpAmount) || 0;

      let expensesTotal = 0;
      const finalExpenses = [];
      const expensesSource = body.expenses !== undefined ? body.expenses : (existingSale.expenses || []);
      if (Array.isArray(expensesSource)) {
        expensesSource.forEach(exp => {
          const amt = parseFloat(exp.amount) || 0;
          if (amt > 0 && exp.description) {
            expensesTotal += amt;
            finalExpenses.push({ description: exp.description, amount: amt });
          }
        });
      }
      updateData.expenses = finalExpenses;
      updateData.expensesTotal = expensesTotal;

      // Recalculate debt
      const netExpected = updateData.totalAmount - expensesTotal;
      const rawDiff = Math.round((netExpected - updateData.cashAmount - updateData.digitalAmount - updateData.hpAmount) * 100) / 100;
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
              settled: entry.settled || false
            });
          }
        });
        const remainingDebt = Math.round((debtAmount - sumOfDebts) * 100) / 100;
        if (remainingDebt > 0) {
          finalDebtEntries.push({
            clientName: updateData.operatorName || body.operatorName || existingSale.operatorName,
            amount: remainingDebt,
            settled: false
          });
        }
      } else if (rawDiff < 0) {
        extraIncome = Math.abs(rawDiff);
      }

      updateData.debtAmount = debtAmount;
      updateData.extraIncome = extraIncome;
      updateData.debtEntries = finalDebtEntries;
      updateData.debtSettled = debtAmount <= 0;
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Sale entry not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const role = request.headers.get('x-user-role');
    if (role === 'manager') {
      return NextResponse.json({ error: 'Managers cannot delete sales' }, { status: 403 });
    }

    const { id } = await params;
    const collection = await getCollection('dailySales');

    const sale = await collection.findOne({ _id: new ObjectId(id) });
    if (!sale) {
      return NextResponse.json({ error: 'Sale entry not found' }, { status: 404 });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount > 0 && sale.saleType === 'inventory' && sale.items) {
      const inventoryCollection = await getCollection('inventory');
      for (const item of sale.items) {
        if (item.inventoryId) {
          await inventoryCollection.updateOne(
            { _id: new ObjectId(item.inventoryId) },
            { $inc: { stock: item.quantity } }
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
