const { MongoClient, ServerApiVersion } = require('mongodb');

// Replace with your actual password (URL-encoded if it has special characters!)
const password = 'YOUR_NEW_PASSWORD_HERE';
const uri = `mongodb+srv://markjavenamanalo_db_user:${password}@cluster0.okmu29q.mongodb.net/training-tracker?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  serverSelectionTimeoutMS: 10000,
});

async function run() {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Successfully connected!');
    
    // Test ping
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Ping successful - database is responding!");
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.close();
    console.log('Connection closed.');
  }
}

run();