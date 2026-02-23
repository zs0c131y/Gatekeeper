const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // assumes running from backend/scripts/

const Backend = require('../src/models/Backend');
const Route = require('../src/models/Route');

const TEMP_SERVERS = [
    { name: 'Temp Server 1', baseUrl: 'http://temp:3000', prefix: '/temp1' },
    { name: 'Temp Server 2', baseUrl: 'http://temp-2:3000', prefix: '/temp2' }
];

async function addTempRoutes() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI environment variable is not set');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        for (const server of TEMP_SERVERS) {
            // 1. Create or find Backend
            let backend = await Backend.findOne({ name: server.name });
            if (!backend) {
                backend = await Backend.create({
                    name: server.name,
                    baseUrl: server.baseUrl,
                    isActive: true
                });
                console.log(`Created Backend: ${server.name} -> ${server.baseUrl}`);
            } else {
                console.log(`Backend already exists: ${server.name}`);
            }

            // 2. Create or find Route
            const routePath = `${server.prefix}/*`;
            let route = await Route.findOne({ backendId: backend._id, path: routePath });

            if (!route) {
                route = await Route.create({
                    backendId: backend._id,
                    method: '*',
                    path: routePath,
                    isActive: true,
                    priority: 50, // Standard priority
                    requiresAuth: false, // Make it accessible for testing
                });
                console.log(`Created Route: ${routePath} -> ${server.name}`);
            } else {
                console.log(`Route already exists: ${routePath}`);
            }
        }

        console.log('\nSuccess! Your gateway is now configured.');
        console.log('Test URLs once docker-compose is running:');
        console.log('- http://localhost:9000/gateway/temp1/');
        console.log('- http://localhost:9000/gateway/temp2/');


    } catch (error) {
        console.error('Error configuring temp routes:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

addTempRoutes();
