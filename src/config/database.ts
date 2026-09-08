import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/requisition-management';

mongoose.set('bufferCommands', false); // CRITICAL: fail fast, don't hang

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.warn('MongoDB connection warning:', error);
    console.warn('[AI Studio] Continuing without MongoDB — fallback active');
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected successfully');
  } catch (error) {
    console.error('MongoDB disconnection error:', error);
  }
};