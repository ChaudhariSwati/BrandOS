require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function main() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.log('No MONGO_URI set'); return; }
    await mongoose.connect(uri);
    const users = await User.find({}).select('email provider name');
    console.log('Users in database:');
    if (users.length === 0) {
      console.log('  (none)');
    } else {
      users.forEach(u => console.log(`  - ${u.email} (name: ${u.name}, provider: ${u.provider})`));
    }
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error:', e.message);
  }
}
main();
