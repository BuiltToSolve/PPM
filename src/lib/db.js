import clientPromise from './mongodb';

const DB_NAME = 'ppm';

export async function getDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}

// Pump configuration - seeded on first API call
export const PUMP_CONFIG = [
  { pumpNumber: 1, name: 'Pump 1', fuelTypes: ['Petrol', 'Diesel'] },
  { pumpNumber: 2, name: 'Pump 2', fuelTypes: ['Petrol', 'Diesel'] },
  { pumpNumber: 3, name: 'Pump 3', fuelTypes: ['Petrol', 'Premium Petrol'] },
  { pumpNumber: 4, name: 'Pump 4', fuelTypes: ['Petrol', 'Premium Petrol'] },
  { pumpNumber: 5, name: 'Pump 5', fuelTypes: ['CNG'] },
];

export const ALL_FUEL_TYPES = ['Petrol', 'Diesel', 'Premium Petrol', 'CNG'];

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
