// This script checks if a specific vendor is eligible to bid on requisitions
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

async function checkVendorBidEligibility(vendorId) {
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
    
    const vendorCategorySchema = new mongoose.Schema({
      name: String,
      description: String
    });
    
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
    const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);
    const VendorCategory = mongoose.models.VendorCategory || mongoose.model('VendorCategory', vendorCategorySchema);
    const Requisition = mongoose.models.Requisition || mongoose.model('Requisition', requisitionSchema);
    
    // Find the vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      console.log(`Vendor with ID ${vendorId} not found`);
      return;
    }
    
    console.log('Vendor Details:');
    console.log('--------------');
    console.log(`ID: ${vendor._id}`);
    console.log(`Name: ${vendor.name}`);
    console.log(`Email: ${vendor.email}`);
    console.log(`Verified: ${vendor.isVerified}`);
    console.log(`Active: ${vendor.isActive}`);
    
    // Get vendor's categories
    const vendorCategoryIds = vendor.categories.map(id => id.toString());
    const categories = await VendorCategory.find({ _id: { $in: vendor.categories } });
    console.log('\nVendor Categories:');
    console.log('-----------------');
    if (categories.length === 0) {
      console.log('Vendor has no categories');
    } else {
      categories.forEach(category => {
        console.log(`- ${category.name} (ID: ${category._id})`);
      });
    }
    
    // Find requisitions in VENDOR_BIDDING status
    const biddingRequisitions = await Requisition.find({ status: 'vendorBidding' })
      .populate('vendorCategory', 'name _id');
      
    console.log('\nRequisitions open for bidding:');
    console.log('----------------------------');
    
    if (biddingRequisitions.length === 0) {
      console.log('No requisitions currently open for bidding');
      return;
    }
    
    // Check each requisition for eligibility
    console.log('\nEligibility analysis:');
    console.log('-------------------');
    
    for (const req of biddingRequisitions) {
      console.log(`\nRequisition: ${req.requisitionNumber} - ${req.title} (ID: ${req._id})`);
      
      // Check if vendor is explicitly selected
      const isExplicitlySelected = req.selectedVendors && 
        req.selectedVendors.some(id => id.toString() === vendorId);
      
      console.log(`Vendor explicitly selected: ${isExplicitlySelected ? 'Yes' : 'No'}`);
      
      // Check if vendor's category matches requisition category
      const categoryMatches = req.vendorCategory && 
        vendorCategoryIds.includes(req.vendorCategory.toString());
      
      console.log(`Vendor category matches: ${categoryMatches ? 'Yes' : 'No'}`);
      console.log(`Requisition category: ${req.vendorCategory ? req.vendorCategory.name || req.vendorCategory : 'None'} (ID: ${req.vendorCategory ? req.vendorCategory._id : 'None'})`);
      
      // Check overall eligibility
      const isEligible = isExplicitlySelected || categoryMatches;
      console.log(`ELIGIBLE TO BID: ${isEligible ? 'YES' : 'NO'}`);
    }
    
  } catch (error) {
    console.error('Error checking vendor bid eligibility:', error);
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

checkVendorBidEligibility(vendorId);