import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, mongoServer: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = (async () => {
      let uri = process.env.MONGODB_URI;

      if (!uri) {
        // Strict Vercel / Production Check
        if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
          throw new Error('MONGODB_URI environment variable is missing in Vercel settings. Please configure MONGODB_URI in Vercel Project Settings.');
        }

        console.log('⚠️ MONGODB_URI not found in local env. Starting MongoMemoryServer for dev testing...');
        try {
          const { MongoMemoryServer } = await import('mongodb-memory-server');
          if (!cached.mongoServer) {
            cached.mongoServer = await MongoMemoryServer.create();
          }
          uri = cached.mongoServer.getUri();
          console.log(`⚡ In-Memory MongoDB running at: ${uri}`);
        } catch (err) {
          console.error('Failed to start MongoMemoryServer:', err);
          throw new Error('MONGODB_URI is missing and local MongoMemoryServer failed to start');
        }
      }

      console.log('✅ Connecting to MongoDB...');
      const mongooseInstance = await mongoose.connect(uri, opts);
      console.log('✅ Connected to MongoDB successfully!');
      return mongooseInstance;
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB Connection Error:', e.message);
    throw e;
  }

  return cached.conn;
}
