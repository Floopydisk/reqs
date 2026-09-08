// Test script for vendor multiple categories feature
require('dotenv').config();
const mongoose = require('mongoose');

async function connectToDatabase() {
  try {
    const DB_URI = process.env.MONGODB_URI;
    if (!DB_URI) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    await mongoose.connect(DB_URI);
    console.log('✓ Connected to MongoDB\n');
  } catch (error) {
    console.error('✗ Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

async function testMultipleCategories() {
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
    
    const categorySchema = new mongoose.Schema({
      name: String,
      description: String
    });
    
    const requisitionSchema = new mongoose.Schema({
      requisitionNumber: String,
      title: String,
      status: String,
      vendorCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorCategory' },
      createdAt: Date
    });
    
    // Create models
    const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);
    const VendorCategory = mongoose.models.VendorCategory || mongoose.model('VendorCategory', categorySchema);
    const Requisition = mongoose.models.Requisition || mongoose.model('Requisition', requisitionSchema);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  VENDOR MULTIPLE CATEGORIES - TEST & VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // 1. Get all available categories
    const allCategories = await VendorCategory.find({});
    console.log('1. AVAILABLE VENDOR CATEGORIES');
    console.log('─────────────────────────────────────────────────────────');
    if (allCategories.length === 0) {
      console.log('⚠ No categories found. Please create categories first.\n');
    } else {
      allCategories.forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat.name} (ID: ${cat._id})`);
        if (cat.description) {
          console.log(`      Description: ${cat.description}`);
        }
      });
      console.log('');
    }
    
    // 2. Find vendors with multiple categories
    const vendorsWithMultipleCategories = await Vendor.find({
      $expr: { $gt: [{ $size: "$categories" }, 1] }
    }).populate('categories', 'name');
    
    console.log('2. VENDORS WITH MULTIPLE CATEGORIES');
    console.log('─────────────────────────────────────────────────────────');
    if (vendorsWithMultipleCategories.length === 0) {
      console.log('⚠ No vendors with multiple categories found.\n');
    } else {
      vendorsWithMultipleCategories.forEach((vendor) => {
        console.log(`\n   Vendor: ${vendor.name} (ID: ${vendor._id})`);
        console.log(`   Email: ${vendor.email}`);
        console.log(`   Categories (${vendor.categories.length}):`);
        vendor.categories.forEach((cat, index) => {
          console.log(`      ${index + 1}. ${cat.name}`);
        });
      });
      console.log('');
    }
    
    // 3. Find all vendors and show their categories
    const allVendors = await Vendor.find({}).populate('categories', 'name');
    console.log('3. ALL VENDORS AND THEIR CATEGORIES');
    console.log('─────────────────────────────────────────────────────────');
    if (allVendors.length === 0) {
      console.log('⚠ No vendors found.\n');
    } else {
      allVendors.forEach((vendor) => {
        const categoryNames = vendor.categories.map(c => c.name).join(', ');
        const categoryCount = vendor.categories.length;
        const categoryIndicator = categoryCount > 1 ? '★ MULTI-CATEGORY' : '  Single Category';
        
        console.log(`\n   ${categoryIndicator}`);
        console.log(`   Vendor: ${vendor.name}`);
        console.log(`   Email: ${vendor.email}`);
        console.log(`   Categories (${categoryCount}): ${categoryNames}`);
        console.log(`   Verified: ${vendor.isVerified ? '✓' : '✗'} | Active: ${vendor.isActive ? '✓' : '✗'}`);
      });
      console.log('');
    }
    
    // 4. Category distribution analysis
    console.log('4. CATEGORY DISTRIBUTION ANALYSIS');
    console.log('─────────────────────────────────────────────────────────');
    
    const categoryStats = await Vendor.aggregate([
      { $unwind: "$categories" },
      { 
        $group: {
          _id: "$categories",
          vendorCount: { $sum: 1 },
          vendors: { $push: "$name" }
        }
      },
      {
        $lookup: {
          from: "vendorcategories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryInfo"
        }
      },
      { $unwind: "$categoryInfo" },
      { $sort: { vendorCount: -1 } }
    ]);
    
    if (categoryStats.length === 0) {
      console.log('⚠ No category statistics available.\n');
    } else {
      categoryStats.forEach((stat, index) => {
        console.log(`\n   ${index + 1}. ${stat.categoryInfo.name}`);
        console.log(`      Vendors: ${stat.vendorCount}`);
        console.log(`      Vendor Names: ${stat.vendors.join(', ')}`);
      });
      console.log('');
    }
    
    // 5. Bidding eligibility simulation
    console.log('5. BIDDING ELIGIBILITY SIMULATION');
    console.log('─────────────────────────────────────────────────────────');
    
    const openRequisitions = await Requisition.find({ 
      status: 'vendorBidding' 
    }).populate('vendorCategory', 'name');
    
    if (openRequisitions.length === 0) {
      console.log('⚠ No open requisitions for bidding.\n');
    } else {
      for (const req of openRequisitions) {
        console.log(`\n   Requisition: ${req.requisitionNumber} - ${req.title}`);
        console.log(`   Category: ${req.vendorCategory ? req.vendorCategory.name : 'None'}`);
        
        if (req.vendorCategory) {
          // Find eligible vendors
          const eligibleVendors = await Vendor.find({
            categories: req.vendorCategory._id,
            isVerified: true,
            isActive: true
          });
          
          console.log(`   Eligible Vendors: ${eligibleVendors.length}`);
          if (eligibleVendors.length > 0) {
            eligibleVendors.forEach((v, i) => {
              const catCount = v.categories.length;
              const multiCat = catCount > 1 ? ` (★ Has ${catCount} categories)` : '';
              console.log(`      ${i + 1}. ${v.name}${multiCat}`);
            });
          }
        }
      }
      console.log('');
    }
    
    // 6. Summary statistics
    console.log('6. SUMMARY STATISTICS');
    console.log('─────────────────────────────────────────────────────────');
    const totalVendors = allVendors.length;
    const multiCategoryVendors = vendorsWithMultipleCategories.length;
    const singleCategoryVendors = totalVendors - multiCategoryVendors;
    const avgCategoriesPerVendor = totalVendors > 0 
      ? (allVendors.reduce((sum, v) => sum + v.categories.length, 0) / totalVendors).toFixed(2)
      : 0;
    
    console.log(`   Total Vendors: ${totalVendors}`);
    console.log(`   Multi-Category Vendors: ${multiCategoryVendors} (${totalVendors > 0 ? ((multiCategoryVendors/totalVendors)*100).toFixed(1) : 0}%)`);
    console.log(`   Single-Category Vendors: ${singleCategoryVendors} (${totalVendors > 0 ? ((singleCategoryVendors/totalVendors)*100).toFixed(1) : 0}%)`);
    console.log(`   Average Categories per Vendor: ${avgCategoriesPerVendor}`);
    console.log(`   Total Categories: ${allCategories.length}`);
    console.log(`   Open Requisitions: ${openRequisitions.length}`);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('✗ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB\n');
  }
}

testMultipleCategories();