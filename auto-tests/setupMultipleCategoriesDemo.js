// Script to add more categories and update vendors with multiple categories
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

async function setupMultipleCategoriesDemo() {
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
    
    // Create models
    const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);
    const VendorCategory = mongoose.models.VendorCategory || mongoose.model('VendorCategory', categorySchema);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  SETTING UP MULTIPLE CATEGORIES DEMO');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Step 1: Create additional categories if they don't exist
    console.log('Step 1: Creating Additional Categories');
    console.log('─────────────────────────────────────────────────────────\n');
    
    const categoriesToCreate = [
      { name: 'Office Supplies', description: 'Stationery, paper, and general office items' },
      { name: 'Furniture', description: 'Office furniture and fixtures' },
      { name: 'Cleaning Supplies', description: 'Janitorial and cleaning products' },
      { name: 'Software', description: 'Software licenses and applications' },
      { name: 'Catering Services', description: 'Food and beverage services' },
      { name: 'Construction Materials', description: 'Building and construction supplies' },
      { name: 'Electrical Equipment', description: 'Electrical supplies and equipment' }
    ];
    
    const createdCategories = [];
    
    for (const catData of categoriesToCreate) {
      // Check if category already exists
      let category = await VendorCategory.findOne({ name: catData.name });
      
      if (!category) {
        category = await VendorCategory.create(catData);
        console.log(`   ✓ Created: ${category.name} (ID: ${category._id})`);
        createdCategories.push(category);
      } else {
        console.log(`   ⊙ Already exists: ${category.name} (ID: ${category._id})`);
        createdCategories.push(category);
      }
    }
    
    // Get IT Hardware category
    const itHardware = await VendorCategory.findOne({ name: 'IT Hardware' });
    if (itHardware) {
      createdCategories.unshift(itHardware); // Add to beginning
    }
    
    console.log(`\n   Total Categories Available: ${createdCategories.length}\n`);
    
    // Step 2: Update existing vendors with multiple categories
    console.log('Step 2: Updating Vendors with Multiple Categories');
    console.log('─────────────────────────────────────────────────────────\n');
    
    const vendors = await Vendor.find({});
    
    if (vendors.length === 0) {
      console.log('   ⚠ No vendors found to update.\n');
    } else {
      // Find categories
      const officeSupplies = createdCategories.find(c => c.name === 'Office Supplies');
      const furniture = createdCategories.find(c => c.name === 'Furniture');
      const software = createdCategories.find(c => c.name === 'Software');
      const cleaning = createdCategories.find(c => c.name === 'Cleaning Supplies');
      
      // Update first vendor to have IT Hardware, Office Supplies, and Furniture
      if (vendors[0] && itHardware && officeSupplies && furniture) {
        const vendor1 = vendors[0];
        const newCategories = [itHardware._id, officeSupplies._id, furniture._id];
        
        // Check if already has these categories
        const currentCategories = vendor1.categories.map(c => c.toString());
        const needsUpdate = !newCategories.every(nc => 
          currentCategories.includes(nc.toString())
        );
        
        if (needsUpdate) {
          vendor1.categories = newCategories;
          await vendor1.save();
          console.log(`   ✓ Updated: ${vendor1.name}`);
          console.log(`     Categories: IT Hardware, Office Supplies, Furniture`);
          console.log(`     Can now bid on requisitions in any of these 3 categories\n`);
        } else {
          console.log(`   ⊙ ${vendor1.name} already has these categories\n`);
        }
      }
      
      // Update second vendor to have IT Hardware and Software
      if (vendors[1] && itHardware && software) {
        const vendor2 = vendors[1];
        const newCategories = [itHardware._id, software._id];
        
        const currentCategories = vendor2.categories.map(c => c.toString());
        const needsUpdate = !newCategories.every(nc => 
          currentCategories.includes(nc.toString())
        );
        
        if (needsUpdate) {
          vendor2.categories = newCategories;
          await vendor2.save();
          console.log(`   ✓ Updated: ${vendor2.name}`);
          console.log(`     Categories: IT Hardware, Software`);
          console.log(`     Can now bid on requisitions in any of these 2 categories\n`);
        } else {
          console.log(`   ⊙ ${vendor2.name} already has these categories\n`);
        }
      }
      
      // Update third vendor to have Office Supplies, Furniture, and Cleaning
      if (vendors[2] && officeSupplies && furniture && cleaning) {
        const vendor3 = vendors[2];
        const newCategories = [officeSupplies._id, furniture._id, cleaning._id];
        
        const currentCategories = vendor3.categories.map(c => c.toString());
        const needsUpdate = !newCategories.every(nc => 
          currentCategories.includes(nc.toString())
        );
        
        if (needsUpdate) {
          vendor3.categories = newCategories;
          await vendor3.save();
          console.log(`   ✓ Updated: ${vendor3.name}`);
          console.log(`     Categories: Office Supplies, Furniture, Cleaning Supplies`);
          console.log(`     Can now bid on requisitions in any of these 3 categories\n`);
        } else {
          console.log(`   ⊙ ${vendor3.name} already has these categories\n`);
        }
      }
    }
    
    // Step 3: Show summary
    console.log('Step 3: Summary of Changes');
    console.log('─────────────────────────────────────────────────────────\n');
    
    const updatedVendors = await Vendor.find({}).populate('categories', 'name');
    
    updatedVendors.forEach((vendor, index) => {
      const categoryNames = vendor.categories.map(c => c.name).join(', ');
      const isMultiCategory = vendor.categories.length > 1;
      
      console.log(`   ${index + 1}. ${vendor.name} ${isMultiCategory ? '★' : ''}`);
      console.log(`      Email: ${vendor.email}`);
      console.log(`      Categories (${vendor.categories.length}): ${categoryNames}`);
      
      if (isMultiCategory) {
        console.log(`      ★ Multi-category vendor - Can bid on ${vendor.categories.length} types of requisitions`);
      }
      console.log('');
    });
    
    const multiCategoryCount = updatedVendors.filter(v => v.categories.length > 1).length;
    console.log(`   Multi-Category Vendors: ${multiCategoryCount} of ${updatedVendors.length}`);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  DEMO SETUP COMPLETED');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('Next Steps:');
    console.log('───────────');
    console.log('1. Run: node testMultipleCategories.js - to verify the changes');
    console.log('2. Test via API: Use Swagger or curl to see bid opportunities');
    console.log('3. Create requisitions in different categories to test bidding\n');
    
  } catch (error) {
    console.error('✗ Error during setup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB\n');
  }
}

setupMultipleCategoriesDemo();