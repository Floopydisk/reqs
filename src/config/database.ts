import dotenv from 'dotenv';
import { createPool } from '../db';

dotenv.config();

export const connectDB = async (): Promise<void> => {
  try {
    const pool = createPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ PostgreSQL connected successfully (Primary Database)');
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    const pool = createPool();
    await pool.end();
    console.log('PostgreSQL pool closed successfully');
  } catch (error) {
    console.error('PostgreSQL disconnection error:', error);
  }
};
