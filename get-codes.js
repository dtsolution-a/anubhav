require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  const org = await db.collection('organizations').findOne({ type: 'agency' });
  console.log('Agency Code:', org ? org.code : 'None');
  
  const clientOrg = await db.collection('organizations').findOne({ type: 'client' });
  console.log('Client Code:', clientOrg ? clientOrg.code : 'None');
  
  await client.close();
}
run().catch(console.error);
