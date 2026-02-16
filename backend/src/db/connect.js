const mongoose = require("mongoose");

let connected = false;

async function connectMongoIfConfigured() {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) return;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    connected = true;
  } catch (err) {
    // Mongo is optional for the MVP. If it isn't reachable, we keep running
    // with in-memory repo metadata.
    // eslint-disable-next-line no-console
    console.warn("[backend] MongoDB not reachable; continuing without it.");
  }
}

module.exports = { connectMongoIfConfigured };

