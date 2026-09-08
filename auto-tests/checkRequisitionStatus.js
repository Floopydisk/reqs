require('dotenv').config();
const mongoose = require('mongoose');

async function connectToDatabase() {
  try {
    const DB_URI = process.env.MONGODB_URI;
    if (!DB_URI) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    await mongoose.connect(DB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

async function checkRequisitionStatus() {
  try {
    await connectToDatabase();
    
    // Get the requisition schema
    const requisitionSchema = new mongoose.Schema({
      status: String,
      // Add other fields as needed
    });
    
    const Requisition = mongoose.model('Requisition', requisitionSchema);
    
    // Query the requisition
    const requisitionId = '68e4dad40f1e7de267693a33';
    const requisition = await Requisition.findById(requisitionId);
    
    if (!requisition) {
      console.log(`Requisition with ID ${requisitionId} not found`);
      return;
    }
    
    console.log('Requisition found:');
    console.log('ID:', requisition._id.toString());
    console.log('Status:', requisition.status);
    console.log('Status type:', typeof requisition.status);
    
    // Check if status is exactly "departmentApproved"
    console.log('Status equals "departmentApproved":', requisition.status === "departmentApproved");
    console.log('Status equals "DEPARTMENT_APPROVED" enum:', requisition.status === "DEPARTMENT_APPROVED");
    
  } catch (error) {
    console.error('Error checking requisition status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkRequisitionStatus();
