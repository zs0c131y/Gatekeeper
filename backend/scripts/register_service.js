const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config({ path: '../.env' }); // assumes running from backend/scripts/

const Backend = require('../src/models/Backend');
const Route = require('../src/models/Route');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

async function registerGatewayService() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI environment variable is not set. Please check your .env file.');
        process.exit(1);
    }

    console.log('\n--- Gateway Service Registration ---');
    console.log('This script will register a new backend service and its routing configuration into the Gateway.\n');

    try {
        // Collect Inputs
        let name, baseUrl, routePath, stripPrefix, requiresAuth;

        if (process.argv.length >= 7) {
            name = process.argv[2];
            baseUrl = process.argv[3];
            routePath = process.argv[4];
            stripPrefix = process.argv[5];
            requiresAuth = process.argv[6].trim().toLowerCase() === 'y';
            console.log(`Using provided arguments: ${name}, ${baseUrl}, ${routePath}, ${stripPrefix}, ${process.argv[6]}`);
        } else {
            name = await askQuestion('Enter Service Name (e.g., "Auth Service", "Temp Server 1"): ');
            if (!name.trim()) throw new Error('Service Name is required.');

            baseUrl = await askQuestion('Enter Base URL (e.g., "http://localhost:3001", "http://temp:3000"): ');
            if (!baseUrl.trim()) throw new Error('Base URL is required.');

            routePath = await askQuestion('Enter Route Path match (e.g., "/auth/*", "/temp1/*"): ');
            if (!routePath.trim()) throw new Error('Route Path is required.');

            stripPrefix = await askQuestion('Enter Route Prefix to strip before forwarding (e.g., "/auth", "/temp1" or leave empty to strip nothing): ');

            const requiresAuthInput = await askQuestion('Does this route require Authentication? (y/N): ');
            requiresAuth = requiresAuthInput.trim().toLowerCase() === 'y';
        }

        console.log('\nConnecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');

        // 1. Create or Find Backend
        let backend = await Backend.findOne({ name: name.trim() });
        if (!backend) {
            backend = await Backend.create({
                name: name.trim(),
                baseUrl: baseUrl.trim(),
                isActive: true
            });
            console.log(`✅ Created new Backend: ${name} -> ${baseUrl}`);
        } else {
            console.log(`ℹ️  Backend already exists: ${name}. Updating Base URL...`);
            backend.baseUrl = baseUrl.trim();
            backend.isActive = true;
            await backend.save();
        }

        // 2. Create or Find Route
        let route = await Route.findOne({ backendId: backend._id, path: routePath.trim() });
        const routeConfig = {
            backendId: backend._id,
            method: '*',
            path: routePath.trim(),
            isActive: true,
            priority: 50, // Standard priority
            requiresAuth: requiresAuth,
        };

        if (stripPrefix.trim()) {
            routeConfig.stripPrefix = stripPrefix.trim();
        } else {
            routeConfig.stripPrefix = null; // Ensure there is no stripping if explicitly asked
        }

        if (!route) {
            route = await Route.create(routeConfig);
            console.log(`✅ Created Route: ${routePath} -> ${name}`);
        } else {
            console.log(`ℹ️  Route already exists: ${routePath}. Updating configuration...`);
            await Route.updateOne({ _id: route._id }, { $set: routeConfig });
            console.log(`✅ Updated Route: ${routePath}`);
        }

        console.log('\n🎉 Success! Your gateway is now configured.');
        console.log(`Gateway Path:   ${routePath}`);
        console.log(`Target Backend: URL: ${baseUrl}${stripPrefix.trim() ? `, Strip Prefix: ${stripPrefix}` : ''}`);

    } catch (error) {
        console.error('\n❌ Error configuring gateway service:', error.message);
    } finally {
        rl.close();
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log('\nDisconnected from MongoDB');
        }
    }
}

registerGatewayService();
