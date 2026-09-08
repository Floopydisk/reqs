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

async function findDepartmentApprovedRequisitions() {
  try {
    await connectToDatabase();
    
    // Get the requisition schema
    const requisitionSchema = new mongoose.Schema({
      requisitionNumber: String,
      title: String,
      status: String,
      createdAt: Date
    });
    
    const Requisition = mongoose.model('Requisition', requisitionSchema);
    
    // Find requisitions with departmentApproved status
    const requisitions = await Requisition.find({ status: "departmentApproved" }).limit(5);
    
    if (requisitions.length === 0) {
      console.log('No requisitions found with status "departmentApproved"');
      return;
    }
    
    console.log(`Found ${requisitions.length} requisitions with status "departmentApproved":`);
    requisitions.forEach((req, index) => {
      console.log(`\nRequisition #${index + 1}:`);
      console.log('ID:', req._id.toString());
      console.log('Number:', req.requisitionNumber);
      console.log('Title:', req.title);
      console.log('Created:', req.createdAt);
    });
    
  } catch (error) {
    console.error('Error finding requisitions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

findDepartmentApprovedRequisitions();