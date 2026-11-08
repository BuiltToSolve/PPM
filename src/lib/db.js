import clientPromise from './mongodb.js';

const DB_NAME = 'ppm';

export async function getDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}

// Initial pump configuration template
export const PUMP_CONFIG = [
  { pumpNumber: 1, name: 'Pump 1', fuelTypes: ['Petrol', 'Diesel'] },
  { pumpNumber: 2, name: 'Pump 2', fuelTypes: ['Petrol', 'Diesel'] },
  { pumpNumber: 3, name: 'Pump 3', fuelTypes: ['Petrol', 'Premium Petrol'] },
  { pumpNumber: 4, name: 'Pump 4', fuelTypes: ['Petrol', 'Premium Petrol'] },
  { pumpNumber: 5, name: 'Pump 5 (CNG)', fuelTypes: ['CNG'] },
];

export const ALL_FUEL_TYPES = ['Petrol', 'Diesel', 'Premium Petrol', 'CNG'];

let indexesEnsured = false;

/**
 * Ensures required database indexes exist for performance & consistency.
 */
export async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const db = await getDb();

    // 1. dailySales
    const dailySales = db.collection('dailySales');
    await dailySales.createIndex({ date: -1, saleType: 1 });
    await dailySales.createIndex({ date: 1 });
    await dailySales.createIndex({ debtAmount: 1, debtSettled: 1 });
    await dailySales.createIndex({ operatorId: 1 });

    // 2. users (unique username)
    const users = db.collection('users');
    await users.createIndex({ username: 1 }, { unique: true });

    // 3. fuelRates (unique fuelType)
    const fuelRates = db.collection('fuelRates');
    await fuelRates.createIndex({ fuelType: 1 }, { unique: true });

    // 4. inventory
    const inventory = db.collection('inventory');
    await inventory.createIndex({ category: 1 });
    await inventory.createIndex({ name: 1 });

    // 5. operators
    const operators = db.collection('operators');
    await operators.createIndex({ active: 1 });

    // 6. customers
    const customers = db.collection('customers');
    await customers.createIndex({ name: 1 });
    await customers.createIndex({ phone: 1 });

    indexesEnsured = true;
  } catch (err) {
    console.error('Failed ensuring MongoDB indexes:', err);
  }
}

// Seed pumps into DB if not already present
export async function seedPumps() {
  const collection = await getCollection('pumps');
  const count = await collection.countDocuments();
  if (count === 0) {
    await collection.insertMany(PUMP_CONFIG);
  }
}

// Seed default fuel rates if not present
export async function seedFuelRates() {
  const collection = await getCollection('fuelRates');
  const count = await collection.countDocuments();
  if (count === 0) {
    const defaultRates = ALL_FUEL_TYPES.map(fuel => ({
      fuelType: fuel,
      rate: 0,
      updatedAt: new Date(),
    }));
    await collection.insertMany(defaultRates);
  }
}
