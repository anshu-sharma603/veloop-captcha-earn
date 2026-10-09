const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); // Atlas SRV lookup fix (ISP DNS issue)

const mongoose = require('mongoose');
const config = require('./index');

const state = { transactions: false };

async function connectDB(uri = config.mongoUri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  // Transactions need a replica set / Atlas / mongos. Detect instead of assuming.
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    state.transactions = Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch {
    state.transactions = false;
  }
  // Build indexes up-front (unique / partial indexes are part of the security model).
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  console.log(`MongoDB connected | transactions: ${state.transactions ? 'ON' : 'OFF (atomic single-doc updates + compensation)'}`);
  return mongoose.connection;
}

/**
 * Runs fn(session). With a replica set it is a real multi-document ACID transaction
 * (auto-retried on transient errors). On standalone MongoDB session is null and
 * callers rely on atomic single-document updates + compensation.
 */
async function runAtomic(fn) {
  if (!state.transactions) return fn(null);
  const session = await mongoose.startSession();
  try {
    let out;
    await session.withTransaction(async () => {
      out = await fn(session);
    });
    return out;
  } finally {
    await session.endSession();
  }
}

module.exports = { connectDB, runAtomic, dbState: state };