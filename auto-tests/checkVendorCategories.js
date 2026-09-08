// This is a debugging script to check if vendors are properly assigned to categories
// Usage: node checkVendorCategories.js <categoryId>

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

// Define schema for Vendor
const VendorSchema = new mongoose.Schema({
  name: String,
  email: String,
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VendorCategory' }],
  isVerified: Boolean,
  isActive: Boolean,
  status: String
});

// Define schema for VendorCategory
const VendorCategorySchema = new mongoose.Schema({
  name: String,
  description: String
});

// Create models
const Vendor = mongoose.model('Vendor', VendorSchema);
const VendorCategory = mongoose.model('VendorCategory', VendorCategorySchema);

// Get category ID from command line argument
const categoryId = process.argv[2];

async function checkVendorCategories() {
  try {
    // If a category ID is provided, check that specific category
    if (categoryId) {
      const category = await VendorCategory.findById(categoryId);
      if (!category) {
        console.log(`Category with ID ${categoryId} not found`);
        process.exit(1);
      }
      
      console.log(`\nCategory: ${category.name} (${category._id})`);
      
      // Find vendors in this category
      const vendors = await Vendor.find({ 
        categories: category._id,
        isVerified: true,
        isActive: true
      });
      
      console.log(`\nFound ${vendors.length} verified and active vendors in this category:`);
      
      if (vendors.length === 0) {
        console.log('No verified vendors found in this category!');
      } else {
        vendors.forEach(vendor => {
          console.log(`- ${vendor.name} (${vendor._id})`);
          console.log(`  Email: ${vendor.email}`);
          console.log(`  Status: ${vendor.status}`);
          console.log(`  Verified: ${vendor.isVerified}`);
          console.log(`  Active: ${vendor.isActive}`);
          console.log(`  Categories: ${vendor.categories.join(', ')}`);
        });
      }
    } else {
      // List all categories
      const categories = await VendorCategory.find();
      console.log(`\nFound ${categories.length} vendor categories:`);
      
      for (const category of categories) {
        console.log(`\nCategory: ${category.name} (${category._id})`);
        
        // Find vendors in this category
        const vendors = await Vendor.find({ 
          categories: category._id,
          isVerified: true,
          isActive: true
        });
        
        console.log(`Found ${vendors.length} verified and active vendors in this category.`);
        
        if (vendors.length > 0) {
          vendors.forEach(vendor => {
            console.log(`- ${vendor.name} (${vendor._id})`);
          });
        }
      }
    }
    
    // Count total vendors
    const totalVendors = await Vendor.countDocuments();
    console.log(`\nTotal vendors in database: ${totalVendors}`);
    
    // Show vendors with no categories
    const vendorsWithNoCategories = await Vendor.find({ 
      $or: [
        { categories: { $exists: false } },
        { categories: { $size: 0 } }
      ]
    });
    
    console.log(`Vendors with no categories: ${vendorsWithNoCategories.length}`);
    if (vendorsWithNoCategories.length > 0) {
      vendorsWithNoCategories.forEach(vendor => {
        console.log(`- ${vendor.name} (${vendor._id})`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkVendorCategories();