require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./dist/models/user.model').default;
const Department = require('./dist/models/department.model').default;
const Location = require('./dist/models/location.model').default;
const Requisition = require('./dist/models/requisition.model').default;
const { db } = require('./dist/db');
const { requisitions } = require('./dist/db/schema');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const user = await User.findOne();
  const location = await Location.findOne();
  const department = await Department.findOne();

  const req = new Requisition({
    title: "Test Requisition " + Date.now(),
    justification: "Testing DB sync",
    deliveryLocation: location._id,
    deliveryDate: new Date(),
    requester: user._id,
    department: department._id,
    items: [{
      itemName: "Laptop",
      itemType: "product",
      itemDescription: "Macbook Pro",
      isWorkTool: true,
      units: 1
    }]
  });

  await req.save();
  console.log("Saved to mongo. REQ ID:", req._id.toString());
  
  // Wait a sec for the async hook if any (though it's awaited in the hook)
  const pgReqs = await db.query.requisitions.findMany();
  console.log("PG Requisitions count:", pgReqs.length);
  const found = pgReqs.find(r => r.id === req._id.toString());
  console.log("Found in PG:", !!found);
  
  process.exit(0);
}
test().catch(console.error);
