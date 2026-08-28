/**
 * Environment Configuration
 * Centralizes all environment variable access with defaults
 */
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare_assistant',
  JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  NODE_ENV: process.env.NODE_ENV || 'development',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
};
