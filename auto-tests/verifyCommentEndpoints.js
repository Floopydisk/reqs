const axios = require('axios');
require('dotenv').config();

// Define base URL for API
const baseURL = 'http://localhost:3003/api';

// Get token from the command line or set default
const token = process.argv[2] || '';

// Axios instance with authentication header
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `token=${token}`
  }
});

// Test the comment endpoints
async function testCommentEndpoints() {
  try {
    console.log('====================================');
    console.log('TESTING COMMENT ENDPOINTS');
    console.log('====================================');
    
    // 1. Create a new test requisition
    console.log('\n1. Creating a test requisition...');
    const requisitionData = {
      title: "Test Requisition for Comment API Testing",
      category: "Office Supplies",
      description: "This is a test requisition created to verify comment endpoints",
      quantityNeeded: 1,
      estimatedUnitPrice: 100,
      priority: "low",
      justification: "Testing comment endpoints"
    };
    
    let requisitionId;
    try {
      const createReqRes = await api.post('/requisitions', requisitionData);
      requisitionId = createReqRes.data.data._id;
      console.log(`Created new test requisition with ID: ${requisitionId}`);
    } catch (reqCreateErr) {
      console.error('Failed to create test requisition:', reqCreateErr.response?.data || reqCreateErr.message);
      
      // Fallback to getting existing requisitions
      console.log('Falling back to getting existing requisitions...');
      const requisitionsRes = await api.get('/requisitions');
      
      if (!requisitionsRes.data.data || requisitionsRes.data.data.length === 0) {
        console.log('No requisitions found. Please create a requisition first.');
        return;
      }
      
      requisitionId = requisitionsRes.data.data[0]._id;
      console.log(`Found existing requisition ID for testing: ${requisitionId}`);
    }
    
    // 2. Add a comment to a requisition
    console.log('\n2. Adding a comment to requisition...');
    const commentData = {
      text: 'This is a test comment from the verification script'
    };
    
    try {
      const addCommentRes = await api.post(`/requisitions/${requisitionId}/comments`, commentData);
      console.log('Comment added successfully!');
      console.log('Response:', JSON.stringify(addCommentRes.data, null, 2));
      
      // Store the comment ID for later use
      const commentId = addCommentRes.data.data._id;
      
      // 3. Get comments for the requisition
      console.log('\n3. Getting comments for requisition...');
      const getCommentsRes = await api.get(`/requisitions/${requisitionId}/comments`);
      console.log('Retrieved comments successfully!');
      console.log(`Found ${getCommentsRes.data.count} comments`);
      
      // 4. Edit the comment
      if (commentId) {
        console.log('\n4. Editing comment...');
        const editData = {
          text: 'This comment was edited through the verification script'
        };
        
        try {
          const editCommentRes = await api.patch(`/comments/${commentId}`, editData);
          console.log('Comment edited successfully!');
          console.log('Response:', JSON.stringify(editCommentRes.data, null, 2));
          
          // 5. Get comment thread
          console.log('\n5. Getting comment thread...');
          const threadRes = await api.get(`/comments/${commentId}/thread`);
          console.log('Retrieved comment thread successfully!');
          console.log('Response:', JSON.stringify(threadRes.data, null, 2));
          
          // 6. Delete the comment
          console.log('\n6. Deleting comment...');
          try {
            const deleteRes = await api.delete(`/comments/${commentId}`);
            console.log('Comment deleted successfully!');
            console.log('Response:', JSON.stringify(deleteRes.data, null, 2));
          } catch (deleteErr) {
            console.error('Error deleting comment:', deleteErr.response?.data || deleteErr.message);
          }
        } catch (editErr) {
          console.error('Error editing comment:', editErr.response?.data || editErr.message);
        }
      }
    } catch (addCommentErr) {
      console.error('Error adding comment:', addCommentErr.response?.data || addCommentErr.message);
    }
    
    console.log('\n====================================');
    console.log('ENDPOINT VERIFICATION COMPLETED');
    console.log('====================================');
    
  } catch (error) {
    console.error('Error in verification script:', error.response?.data || error.message);
  }
}

// Execute the tests
testCommentEndpoints();