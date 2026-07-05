import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://abhias001:loverock007@clusterfordev.zpvwwuj.mongodb.net/?appName=ClusterForDev';

async function seedUser() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('ppm');
    const collection = db.collection('users');

    const adminUser = await collection.findOne({ username: 'admin' });
    if (!adminUser) {
      await collection.insertOne({
        username: 'admin',
        password: 'RV@321', // Plain text as requested for manual DB management
        createdAt: new Date(),
      });
      console.log('Admin user seeded successfully.');
    } else {
      // Ensure password matches the required one
      await collection.updateOne(
        { username: 'admin' },
        { $set: { password: 'RV@321' } }
      );
      console.log('Admin user already exists. Password verified.');
    }
  } catch (error) {
    console.error('Error seeding user:', error);
  } finally {
    await client.close();
  }
}

seedUser();
