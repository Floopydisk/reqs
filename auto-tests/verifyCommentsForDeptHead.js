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

// Verify comments on a DRAFT requisition - should work for department heads
async function verifyCommentEndpoints() {
  try {
    console.log('====================================');
    console.log('VERIFYING COMMENT ENDPOINTS');
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
      
      // 2. Submit the requisition to make it SUBMITTED status (department heads can comment)
      console.log('\n2. Submitting the requisition...');
      await api.put(`/requisitions/${requisitionId}/submit`, {});
      console.log('Requisition submitted successfully');
      
      // 3. Add a comment to the submitted requisition
      console.log('\n3. Adding a comment to submitted requisition...');
      const commentData = {
        text: 'This is a test comment from the department head on a SUBMITTED requisition'
      };
      
      const addCommentRes = await api.post(`/requisitions/${requisitionId}/comments`, commentData);
      console.log('Comment added successfully!');
      console.log('Response:', JSON.stringify(addCommentRes.data, null, 2));
      
      // Store the comment ID for later use
      const commentId = addCommentRes.data.data._id;
      
      // 4. Get comments for the requisition
      console.log('\n4. Getting comments for requisition...');
      const getCommentsRes = await api.get(`/requisitions/${requisitionId}/comments`);
      console.log('Retrieved comments successfully!');
      console.log(`Found ${getCommentsRes.data.count} comments`);
      console.log('Comments:', JSON.stringify(getCommentsRes.data.data, null, 2));
      
      // 5. Edit the comment if we have a commentId
      if (commentId) {
        console.log('\n5. Editing comment...');
        const editData = {
          text: 'This comment was edited by the department head'
        };
        
        const editCommentRes = await api.patch(`/comments/${commentId}`, editData);
        console.log('Comment edited successfully!');
        console.log('Response:', JSON.stringify(editCommentRes.data, null, 2));
        
        // 6. Get comment thread
        console.log('\n6. Getting comment thread...');
        const threadRes = await api.get(`/comments/${commentId}/thread`);
        console.log('Retrieved comment thread successfully!');
        console.log('Response:', JSON.stringify(threadRes.data, null, 2));
        
        // 7. Delete the comment
        console.log('\n7. Deleting comment...');
        const deleteRes = await api.delete(`/comments/${commentId}`);
        console.log('Comment deleted successfully!');
        console.log('Response:', JSON.stringify(deleteRes.data, null, 2));
      }
      
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
    
    console.log('\n====================================');
    console.log('ENDPOINT VERIFICATION COMPLETED');
    console.log('====================================');
  } catch (error) {
    console.error('Error in verification:', error.response?.data || error.message);
  }
}

// Run the verification
verifyCommentEndpoints();