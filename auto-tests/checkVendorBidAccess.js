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

async function checkVendorBidAccess(vendorId) {
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
      selectedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }]
    });
    
    const vendorCategorySchema = new mongoose.Schema({
      name: String,
      description: String
    });
    
    const bidSchema = new mongoose.Schema({
      requisition: { type: mongoose.Schema.Types.ObjectId, ref: 'Requisition' },
      vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
      status: String
    });
    
    // Create models
    const Vendor = mongoose.model('Vendor', vendorSchema);
    const Requisition = mongoose.model('Requisition', requisitionSchema);
    const VendorCategory = mongoose.model('VendorCategory', vendorCategorySchema);
    const Bid = mongoose.model('Bid', bidSchema);
    
    // Check if vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      console.log(`Vendor with ID ${vendorId} not found`);
      return;
    }
    
    console.log('Vendor Information:');
    console.log('--------------------');
    console.log('ID:', vendor._id.toString());
    console.log('Name:', vendor.name);
    console.log('Email:', vendor.email);
    console.log('isVerified:', vendor.isVerified);
    console.log('isActive:', vendor.isActive);
    
    // Check vendor categories
    console.log('\nVendor Categories:');
    console.log('--------------------');
    if (!vendor.categories || vendor.categories.length === 0) {
      console.log('This vendor is not associated with any categories.');
    } else {
      const categories = await VendorCategory.find({
        _id: { $in: vendor.categories }
      });
      
      categories.forEach((category, index) => {
        console.log(`${index + 1}. ${category.name} (ID: ${category._id.toString()})`);
      });
    }
    
    // Find requisitions in VENDOR_BIDDING status with this vendor's category
    console.log('\nRelevant Requisitions in VENDOR_BIDDING status:');
    console.log('----------------------------------------------');
    const relevantRequisitions = await Requisition.find({
      status: 'vendorBidding',
      $or: [
        { vendorCategory: { $in: vendor.categories || [] } },
        { selectedVendors: vendor._id }
      ]
    }).populate('vendorCategory');
    
    if (relevantRequisitions.length === 0) {
      console.log('No relevant requisitions found in VENDOR_BIDDING status for this vendor.');
    } else {
      for (const req of relevantRequisitions) {
        console.log(`\nRequisition: ${req.requisitionNumber} - ${req.title}`);
        console.log(`ID: ${req._id.toString()}`);
        console.log(`Status: ${req.status}`);
        console.log(`Category: ${req.vendorCategory ? req.vendorCategory.name : 'None'}`);
        
        // Check if vendor is in selectedVendors
        const isSelected = req.selectedVendors && req.selectedVendors.some(v => 
          v.toString() === vendor._id.toString()
        );
        
        console.log(`Vendor is in selectedVendors: ${isSelected ? 'Yes' : 'No'}`);
        
        // Check if bids already exist
        const existingBids = await Bid.find({
          requisition: req._id,
          vendor: vendor._id
        });
        
        console.log(`Existing bids for this requisition: ${existingBids.length}`);
        
        if (existingBids.length > 0) {
          existingBids.forEach(bid => {
            console.log(`- Bid ID: ${bid._id.toString()}, Status: ${bid.status}`);
          });
        }
      }
    }
    
    // Check for any bids by this vendor
    console.log('\nAll Bids by this Vendor:');
    console.log('-----------------------');
    const allBids = await Bid.find({ vendor: vendor._id }).populate('requisition', 'requisitionNumber title status');
    
    if (allBids.length === 0) {
      console.log('This vendor has not submitted any bids.');
    } else {
      allBids.forEach(bid => {
        const reqInfo = bid.requisition ? 
          `${bid.requisition.requisitionNumber} - ${bid.requisition.title} (${bid.requisition.status})` : 
          'Unknown Requisition';
        
        console.log(`Bid ID: ${bid._id.toString()}`);
        console.log(`Requisition: ${reqInfo}`);
        console.log(`Status: ${bid.status}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('Error checking vendor bid access:', error);
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

checkVendorBidAccess(vendorId);