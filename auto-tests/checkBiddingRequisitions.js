// This script checks for requisitions in VENDOR_BIDDING status
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

async function checkRequisitions() {
  try {
    await connectToDatabase();
    
    // Define schema for vendor category
    const vendorCategorySchema = new mongoose.Schema({
      name: String,
      description: String
    });
    
    // Define requisition schema
    const requisitionSchema = new mongoose.Schema({
      requisitionNumber: String,
      title: String,
      status: String,
      vendorCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorCategory' },
      selectedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
      biddingDeadline: Date,
      createdAt: Date
    });
    
    // Create models
    const VendorCategory = mongoose.models.VendorCategory || mongoose.model('VendorCategory', vendorCategorySchema);
    const Requisition = mongoose.models.Requisition || mongoose.model('Requisition', requisitionSchema);
    
    // Count total requisitions in VENDOR_BIDDING status
    const totalBiddingRequisitions = await Requisition.countDocuments({ status: 'vendorBidding' });
    console.log(`Total requisitions in VENDOR_BIDDING status: ${totalBiddingRequisitions}`);
    
    // Get all requisitions in VENDOR_BIDDING status with details
    const biddingRequisitions = await Requisition.find({ status: 'vendorBidding' })
      .populate('vendorCategory', 'name description');
      
    console.log('\nRequisitions open for bidding:');
    console.log('----------------------------');
    
    if (biddingRequisitions.length === 0) {
      console.log('No requisitions currently open for bidding');
    } else {
      biddingRequisitions.forEach(req => {
        const categoryInfo = req.vendorCategory ? 
          `${req.vendorCategory.name}` : 
          'No category specified';
          
        console.log(`\nRequisition ID: ${req._id}`);
        console.log(`Number: ${req.requisitionNumber}`);
        console.log(`Title: ${req.title}`);
        console.log(`Status: ${req.status}`);
        console.log(`Category: ${categoryInfo}`);
        console.log(`Bidding Deadline: ${req.biddingDeadline || 'Not set'}`);
        console.log(`Created At: ${req.createdAt}`);
        console.log(`Selected Vendors: ${req.selectedVendors ? req.selectedVendors.length : 0}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking requisitions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkRequisitions();