// One-time migration script to add debtAmount and debtSettled fields to existing sale entries
import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://abhias001:loverock007@clusterfordev.zpvwwuj.mongodb.net/?appName=ClusterForDev';

async function migrate() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('ppm');
  const collection = db.collection('dailySales');

  // Find all entries without debtAmount field
  const sales = await collection.find({ debtAmount: { $exists: false } }).toArray();
  console.log(`Found ${sales.length} entries to migrate`);

  for (const sale of sales) {
    const total = sale.totalAmount || 0;
    const cash = sale.cashAmount || 0;
    const digital = sale.digitalAmount || 0;
    const hp = sale.hpAmount || 0;
    const debtAmount = Math.round((total - cash - digital - hp) * 100) / 100;

    await collection.updateOne(
      { _id: sale._id },
      {
        $set: {
          debtAmount: debtAmount > 0 ? debtAmount : 0,
          debtSettled: debtAmount <= 0,
        },
      }
    );
    console.log(`Migrated ${sale._id}: debt = ${debtAmount > 0 ? debtAmount : 0}`);
  }

  console.log('Migration complete!');
  await client.close();
}

migrate().catch(console.error);
