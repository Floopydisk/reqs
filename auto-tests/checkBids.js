// This script checks if there are any bids in the database
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

async function checkBids() {
  try {
    await connectToDatabase();
    
    // Define bid schema
    const bidSchema = new mongoose.Schema({
      requisition: { type: mongoose.Schema.Types.ObjectId, ref: 'Requisition' },
      vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
      totalPrice: Number,
      status: String,
      createdAt: Date
    });
    
    // Create Bid model
    const Bid = mongoose.models.Bid || mongoose.model('Bid', bidSchema);
    
    // Count total bids
    const totalBids = await Bid.countDocuments({});
    console.log(`Total bids in the database: ${totalBids}`);
    
    // Get all bids with details
    const bids = await Bid.find({})
      .populate('requisition', 'requisitionNumber title')
      .populate('vendor', 'name email');
      
    console.log('\nBids found:');
    console.log('-----------');
    
    if (bids.length === 0) {
      console.log('No bids found in the database');
    } else {
      bids.forEach(bid => {
        const requisitionInfo = bid.requisition ? 
          `${bid.requisition.requisitionNumber} - ${bid.requisition.title}` : 
          'Unknown Requisition';
          
        const vendorInfo = bid.vendor ? 
          `${bid.vendor.name} (${bid.vendor.email})` : 
          'Unknown Vendor';
          
        console.log(`\nBid ID: ${bid._id}`);
        console.log(`Requisition: ${requisitionInfo}`);
        console.log(`Vendor: ${vendorInfo}`);
        console.log(`Status: ${bid.status}`);
        console.log(`Total Price: ${bid.totalPrice}`);
        console.log(`Created At: ${bid.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking bids:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkBids();