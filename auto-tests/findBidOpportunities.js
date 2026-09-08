// This script finds requisitions that a vendor should be able to bid on
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

async function findBidOpportunities(vendorId) {
  try {
    await connectToDatabase();
    
    // Define schemas
    const vendorSchema = new mongoose.Schema({
      name: String,
      email: String,
      categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VendorCategory' }],
      isVerified: Boolean,
      isActive: Boolean
    });
    
    const requisitionSchema = new mongoose.Schema({
      requisitionNumber: String,
      title: String,
      status: String,
      vendorCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorCategory' },
      selectedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
      createdAt: Date,
      biddingDeadline: Date
    });
    
    const categorySchema = new mongoose.Schema({
      name: String,
      description: String
    });
    
    // Create models
    const Vendor = mongoose.model('Vendor', vendorSchema);
    const Requisition = mongoose.model('Requisition', requisitionSchema);
    const VendorCategory = mongoose.model('VendorCategory', categorySchema);
    
    // Find the vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      console.log(`Vendor with ID ${vendorId} not found`);
      return;
    }
    
    console.log('Vendor Details:');
    console.log('--------------');
    console.log(`Name: ${vendor.name}`);
    console.log(`Email: ${vendor.email}`);
    console.log(`Verified: ${vendor.isVerified}`);
    console.log(`Active: ${vendor.isActive}`);
    
    // Get vendor's categories
    const categories = await VendorCategory.find({ _id: { $in: vendor.categories } });
    console.log('\nVendor Categories:');
    console.log('-----------------');
    categories.forEach(category => {
      console.log(`- ${category.name} (${category._id})`);
    });
    
    // Find requisitions in VENDOR_BIDDING status that match the vendor's categories
    const bidOpportunities = await Requisition.find({
      status: 'vendorBidding',
      $or: [
        { vendorCategory: { $in: vendor.categories } },
        { selectedVendors: vendor._id }
      ]
    }).populate('vendorCategory', 'name');
    
    console.log('\nBid Opportunities:');
    console.log('----------------');
    if (bidOpportunities.length === 0) {
      console.log('No bid opportunities found for this vendor');
    } else {
      bidOpportunities.forEach(requisition => {
        console.log(`\nRequisition: ${requisition.requisitionNumber} - ${requisition.title}`);
        console.log(`ID: ${requisition._id}`);
        console.log(`Status: ${requisition.status}`);
        console.log(`Category: ${requisition.vendorCategory ? requisition.vendorCategory.name : 'None'}`);
        console.log(`Category ID: ${requisition.vendorCategory ? requisition.vendorCategory._id : 'None'}`);
        console.log(`Created: ${requisition.createdAt}`);
        console.log(`Bidding Deadline: ${requisition.biddingDeadline || 'Not set'}`);
        
        // Check if vendor is explicitly selected
        const isExplicitlySelected = requisition.selectedVendors && 
          requisition.selectedVendors.some(v => v.toString() === vendor._id.toString());
        
        console.log(`Vendor explicitly selected: ${isExplicitlySelected ? 'Yes' : 'No'}`);
      });
    }
    
  } catch (error) {
    console.error('Error finding bid opportunities:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Get vendor ID from command line argument
const vendorId = process.argv[2];

if (!vendorId) {
  console.error('Please provide a vendor ID as an argument');
  process.exit(1);
}

findBidOpportunities(vendorId);