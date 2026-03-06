const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI, {
  serverApi: { version: '1', strict: true, deprecationErrors: true }
}).then(async () => {
  const db = mongoose.connection.db;
  const user = await db.collection('user').findOne({ email: 'admin@gateway.local' });
  console.log('Before:', JSON.stringify({ role: user.role, id: user.id }));
  await db.collection('user').updateOne(
    { email: 'admin@gateway.local' },
    { $set: { role: 'admin' } }
  );
  const updated = await db.collection('user').findOne({ email: 'admin@gateway.local' });
  console.log('After:', JSON.stringify({ role: updated.role }));
  await mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
