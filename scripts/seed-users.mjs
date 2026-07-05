import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://abhias001:loverock007@clusterfordev.zpvwwuj.mongodb.net/?appName=ClusterForDev';

async function seedUsers() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('ppm');
    const collection = db.collection('users');

    // 1. Ensure admin user has 'admin' role
    await collection.updateOne(
      { username: 'admin' },
      { 
        $set: { 
          password: 'RV@321', // Just in case
          role: 'admin' 
        },
        $setOnInsert: {
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );
    console.log('Admin user updated/seeded with role admin.');

    // 2. Ensure manager user exists
    await collection.updateOne(
      { username: 'manager' },
      { 
        $set: { 
          password: 'Manager@123',
          role: 'manager' 
        },
        $setOnInsert: {
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );
    console.log('Manager user seeded with role manager.');

  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await client.close();
  }
}

seedUsers();
