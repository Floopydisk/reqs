const axios = require('axios');
require('dotenv').config();

// Define base URL for API
const baseURL = 'http://localhost:3000/api';

async function getAuthToken() {
  try {
    // Use the intranet bypass from environment variables
    const bypass = process.env.INTRANET_BYPASS || 'iGNOre';
    
    // Login with a test user ID
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      userId: '45', // Use the user ID from your auth/me example
      bypass
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Extract token from response
    if (loginRes.data.success && loginRes.data.data.token) {
      console.log('Authentication successful!');
      console.log('Token:', loginRes.data.data.token);
      return loginRes.data.data.token;
    } else {
      console.log('Authentication failed:', loginRes.data);
      return null;
    }
  } catch (error) {
    console.error('Authentication error:', error.response?.data || error.message);
    return null;
  }
}

// Execute the login
getAuthToken();