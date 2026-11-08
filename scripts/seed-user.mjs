import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Error: MONGODB_URI environment variable is required.');
  process.exit(1);
}

async function seedUser() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('ppm');
    const collection = db.collection('users');

    const hashedPassword = await bcrypt.hash('RV@321', 12);
    const adminUser = await collection.findOne({ username: 'admin' });
    if (!adminUser) {
      await collection.insertOne({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
      });
      console.log('Admin user seeded successfully with hashed password.');
    } else {
      await collection.updateOne(
        { username: 'admin' },
        { $set: { password: hashedPassword, role: 'admin', updatedAt: new Date() } }
      );
      console.log('Admin user verified and password hash updated.');
    }
  } catch (error) {
    console.error('Error seeding user:', error);
  } finally {
    await client.close();
  }
}

seedUser();
