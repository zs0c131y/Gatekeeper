const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // assumes running from backend/scripts/

const Route = require('../src/models/Route');

async function fixTempRoutes() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI environment variable is not set');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Update the routes to strip the prefix
        const result1 = await Route.updateOne(
            { path: '/temp1/*' },
            { $set: { stripPrefix: '/temp1' } }
        );
        console.log(`Updated /temp1/* route: ${result1.modifiedCount} modified.`);

        const result2 = await Route.updateOne(
            { path: '/temp2/*' },
            { $set: { stripPrefix: '/temp2' } }
        );
        console.log(`Updated /temp2/* route: ${result2.modifiedCount} modified.`);

        console.log('\nSuccess! Your gateway stripPrefix is now configured.');

    } catch (error) {
        console.error('Error configuring temp routes:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

fixTempRoutes();
