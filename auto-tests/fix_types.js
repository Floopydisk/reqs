import mongoose from 'mongoose';
const fs = require('fs');
let bidCtrl = fs.readFileSync('src/controllers/bid.controller.ts', 'utf8');
bidCtrl = bidCtrl.replace(/bid\._id as string/g, 'bid._id as unknown as mongoose.Types.ObjectId');
bidCtrl = bidCtrl.replace(/requisition\.selectedBid = bid\._id as string/g, 'requisition.selectedBid = bid._id as unknown as mongoose.Types.ObjectId');
fs.writeFileSync('src/controllers/bid.controller.ts', bidCtrl);
let poCtrl = fs.readFileSync('src/controllers/purchaseOrder.controller.ts', 'utf8');
poCtrl = poCtrl.replace(/requisition\.purchaseOrder = purchaseOrder\._id as string/g, 'requisition.purchaseOrder = purchaseOrder._id as unknown as mongoose.Types.ObjectId');
fs.writeFileSync('src/controllers/purchaseOrder.controller.ts', poCtrl);
