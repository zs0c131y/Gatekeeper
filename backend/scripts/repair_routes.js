/**
 * repair_routes.js
 *
 * One-time script to fix routes whose stripPrefix was corrupted by Git Bash
 * MSYS2 path conversion (e.g. "C:/Program Files/Git/temp1" → "/temp1").
 *
 * Run from backend/scripts/:
 *   node repair_routes.js
 *
 * Safe to run multiple times — only updates records that still have the
 * Windows-style absolute path.
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });

const Route = require("../src/models/Route");

/**
 * Reverse a Git Bash MSYS path conversion.
 * "C:/Program Files/Git/temp1"   → "/temp1"
 * "C:/Program Files/Git/temp1/*" → "/temp1/*"
 * Already-clean paths are returned unchanged.
 */
function revertMsysPath(value) {
  if (!value) return value;
  const m = value.match(/^[A-Za-z]:[/\\].*?[/\\]([^/\\]+(?:\/\*)?)$/);
  return m ? "/" + m[1] : value;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌  MONGODB_URI not set. Check backend/.env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("✅  Connected\n");

  // Find all routes with Windows-style absolute paths in stripPrefix or path
  const corrupt = await Route.find({
    $or: [{ stripPrefix: /^[A-Za-z]:/ }, { path: /^[A-Za-z]:/ }],
  });

  if (corrupt.length === 0) {
    console.log("✅  No corrupted routes found. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${corrupt.length} corrupted route(s):\n`);
  for (const route of corrupt) {
    const fixedStrip = revertMsysPath(route.stripPrefix);
    const fixedPath = revertMsysPath(route.path);

    console.log(`  Route _id : ${route._id}`);
    console.log(`  path      : "${route.path}" → "${fixedPath}"`);
    console.log(`  strip     : "${route.stripPrefix}" → "${fixedStrip}"`);
    console.log("");

    await Route.updateOne(
      { _id: route._id },
      { $set: { stripPrefix: fixedStrip, path: fixedPath } },
    );
  }

  console.log(`✅  Repaired ${corrupt.length} route(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
