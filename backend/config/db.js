/**
 * MongoDB Connection Configuration
 * Handles connection with retry logic and event listeners, with in-memory fallback
 */
const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

let mongoServer;

const connectDB = async () => {
  try {
    console.log(`Attempting to connect to MongoDB...`);
    // Connect with a 3 second timeout so we don't hang if MongoDB is not running
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected.');
    });

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    console.log('🔄 Starting in-memory MongoDB fallback...');
    
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      console.log(`🚀 In-memory MongoDB Server started at: ${mongoUri}`);
      
      const conn = await mongoose.connect(mongoUri);
      console.log(`✅ Connected to In-memory MongoDB successfully!`);
      
      // Handle process exit to clean up the in-memory database
      const cleanup = async () => {
        try {
          await mongoose.disconnect();
          if (mongoServer) {
            await mongoServer.stop();
          }
        } catch (err) {
          console.error('Error during cleanup:', err.message);
        }
        process.exit(0);
      };
      
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
      
      return conn;
    } catch (fallbackError) {
      console.error(`❌ Failed to start in-memory MongoDB: ${fallbackError.message}`);
      // Retry connecting to original URI after 5 seconds
      console.log('🔄 Retrying original connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    }
  }
};

module.exports = connectDB;
