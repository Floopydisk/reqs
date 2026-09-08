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

// Find a requisition a department head can comment on and test endpoints
async function verifyCommentEndpoints() {
  try {
    console.log('====================================');
    console.log('VERIFYING COMMENT ENDPOINTS');
    console.log('====================================');
    
    // 1. Get requisitions to find one the department head can comment on
    console.log('\n1. Getting requisitions for department head...');
    const requisitionsRes = await api.get('/requisitions');
    
    if (!requisitionsRes.data.data || requisitionsRes.data.data.length === 0) {
      console.log('No requisitions found. Please create a requisition first.');
      return;
    }
    
    console.log(`Found ${requisitionsRes.data.count} requisitions.`);
    
    // Find a requisition that's in SUBMITTED or DEPARTMENT_REJECTED status
    // These are the statuses where department heads can comment
    const commentableRequisition = requisitionsRes.data.data.find(
      req => req.status === 'submitted' || req.status === 'departmentRejected'
    );
    
    if (!commentableRequisition) {
      console.log('No requisitions found in a status where department head can comment (submitted or departmentRejected).');
      console.log('Available requisitions:');
      requisitionsRes.data.data.forEach(req => {
        console.log(`- ID: ${req._id}, Status: ${req.status}, Title: ${req.title}`);
      });
      return;
    }
    
    const requisitionId = commentableRequisition._id;
    console.log(`Found requisition in commentable status: ${requisitionId} (Status: ${commentableRequisition.status})`);
    
    // 2. Test adding a comment
    console.log('\n2. Adding a comment to requisition...');
    const commentData = {
      text: `Test comment on ${commentableRequisition.status} requisition by department head`
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
      
      // 4. Edit the comment if we have a commentId
      if (commentId) {
        console.log('\n4. Editing comment...');
        const editData = {
          text: 'This comment was edited by the department head'
        };
        
        try {
          const editCommentRes = await api.patch(`/comments/${commentId}`, editData);
          console.log('Comment edited successfully!');
          console.log('Response:', JSON.stringify(editCommentRes.data, null, 2));
          
          // 5. Get comment thread
          console.log('\n5. Getting comment thread...');
          try {
            const threadRes = await api.get(`/comments/${commentId}/thread`);
            console.log('Retrieved comment thread successfully!');
            console.log('Response:', JSON.stringify(threadRes.data, null, 2));
          } catch (threadErr) {
            console.error('Error getting comment thread:', threadErr.response?.data || threadErr.message);
          }
          
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
    console.error('Error in verification:', error.response?.data || error.message);
  }
}

// Run the verification
verifyCommentEndpoints();