import mongoose from "mongoose";
import dotenv from "dotenv";
import { db } from "../src/db";
import { requisitions, requisitionItems, requisitionApprovals } from "../src/db/schema";
import Requisition from "../src/models/requisition.model";

dotenv.config();

async function migrate() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB.");

  console.log("Migrating requisitions...");
  const reqs = await Requisition.find();
  for (const req of reqs) {
    try {
      await db.insert(requisitions).values({
        id: req._id.toString(),
        requisitionNumber: req.requisitionNumber,
        title: req.title,
        urgency: req.urgency,
        justification: req.justification,
        deliveryLocationId: req.deliveryLocation.toString(),
        deliveryDate: req.deliveryDate,
        paymentStatus: req.paymentStatus || 'unpaid',
        paymentAmount: req.paymentAmount ? req.paymentAmount.toString() : '0',
        paymentDate: req.paymentDate,
        paymentReference: req.paymentReference,
        paymentNotes: req.paymentNotes,
        paymentById: req.paymentBy?.toString(),
        requesterId: req.requester.toString(),
        departmentId: req.department.toString(),
        assignedApproverId: req.assignedApprover?.toString(),
        status: req.status || 'draft',
        requestApprovedAt: req.requestApprovedAt,
        poApprovedAt: req.poApprovedAt,
        additionalInfo: req.additionalInfo,
      }).onConflictDoNothing();

      if (req.approvals && req.approvals.length > 0) {
        for (const app of req.approvals) {
          await db.insert(requisitionApprovals).values({
            id: app._id ? app._id.toString() : new mongoose.Types.ObjectId().toString(),
            requisitionId: req._id.toString(),
            stage: app.stage,
            approverId: app.approver.toString(),
            status: app.status,
            comments: app.comments,
            timestamp: app.timestamp || new Date(),
          }).onConflictDoNothing();
        }
      }

      if (req.items && req.items.length > 0) {
        for (const item of req.items) {
          await db.insert(requisitionItems).values({
            id: item._id ? item._id.toString() : new mongoose.Types.ObjectId().toString(),
            requisitionId: req._id.toString(),
            itemName: item.itemName,
            itemType: item.itemType,
            preferredBrand: item.preferredBrand,
            itemDescription: item.itemDescription,
            uploadImage: item.uploadImage,
            units: item.units ? item.units.toString() : null,
            UOM: item.UOM,
            recommendedVendorId: item.recommendedVendor?.toString(),
            isWorkTool: item.isWorkTool || false,
            status: item.status || 'pending',
            
            departmentApprovedById: item.departmentApprovedBy?.toString(),
            departmentApprovedAt: item.departmentApprovedAt,
            departmentRejectedById: item.departmentRejectedBy?.toString(),
            departmentRejectedAt: item.departmentRejectedAt,
            departmentComments: item.departmentComments,
            
            hrApprovedById: item.hrApprovedBy?.toString(),
            hrApprovedAt: item.hrApprovedAt,
            hrRejectedById: item.hrRejectedBy?.toString(),
            hrRejectedAt: item.hrRejectedAt,
            hrComments: item.hrComments,
            
            hhraApprovedById: item.hhraApprovedBy?.toString(),
            hhraApprovedAt: item.hhraApprovedAt,
            hhraRejectedById: item.hhraRejectedBy?.toString(),
            hhraRejectedAt: item.hhraRejectedAt,
            hhraComments: item.hhraComments,
            
            procurementComments: item.procurementComments,
            rfqId: item.rfq?.toString(),
            purchaseOrderId: item.purchaseOrder?.toString(),
          }).onConflictDoNothing();
        }
      }
    } catch (err: any) {
      console.log(`Failed to migrate requisition ${req.requisitionNumber}:`, err.message);
    }
  }

  console.log("Migration complete!");
  process.exit(0);
}
migrate();
