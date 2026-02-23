const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const Backend = require('../src/models/Backend');
const Route = require('../src/models/Route');

const TEMP_SERVERS = [
    { name: 'Temp Server 1', baseUrl: 'http://temp:3000', prefix: '/temp1' },
    { name: 'Temp Server 2', baseUrl: 'http://temp-2:3000', prefix: '/temp2' }
];

async function autoRegister() {
    const uri = process.env.MONGODB_URI;
    if (!uri) return console.log('Bypassing temp setup: MONGODB_URI not found.');

    try {
        console.log('Connecting to MongoDB for auto-registration...');
        await mongoose.connect(uri);

        for (const server of TEMP_SERVERS) {
            let backend = await Backend.findOne({ name: server.name });
            if (!backend) {
                backend = await Backend.create({
                    name: server.name,
                    baseUrl: server.baseUrl,
                    isActive: true
                });
            }

            const routePath = `${server.prefix}/*`;
            let route = await Route.findOne({ backendId: backend._id, path: routePath });
            if (!route) {
                await Route.create({
                    backendId: backend._id,
                    method: '*',
                    path: routePath,
                    isActive: true,
                    priority: 50,
                    requiresAuth: false,
                    stripPrefix: server.prefix
                });
            }
        }
        console.log('✅ Temporary servers automatically registered to gateway!');
    } catch (e) {
        console.error('Failed to auto-register:', e.message);
    } finally {
        await mongoose.disconnect();
    }
}

autoRegister();
