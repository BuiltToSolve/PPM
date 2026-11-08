import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Error: MONGODB_URI environment variable is required.');
  process.exit(1);
}

async function seedUsers() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('ppm');
    const collection = db.collection('users');

    const adminHash = await bcrypt.hash('RV@321', 12);
    const managerHash = await bcrypt.hash('Manager@123', 12);
    const viewerHash = await bcrypt.hash('Viewer@123', 12);

    // 1. Ensure admin user has 'admin' role with hashed password
    await collection.updateOne(
      { username: 'admin' },
      { 
        $set: { 
          password: adminHash,
          role: 'admin',
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );
    console.log('Admin user updated/seeded with hashed password.');

    // 2. Ensure manager user exists with hashed password
    await collection.updateOne(
      { username: 'manager' },
      { 
        $set: { 
          password: managerHash,
          role: 'manager',
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );
    console.log('Manager user seeded with hashed password.');

    // 3. Ensure viewer (read-only) user exists with hashed password
    await collection.updateOne(
      { username: 'viewer' },
      { 
        $set: { 
          password: viewerHash,
          role: 'viewer',
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );
    console.log('Viewer (read-only) user seeded with hashed password.');

  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await client.close();
  }
}

seedUsers();
