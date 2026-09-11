import { db } from "../db";
import { 
  requisitions, 
  requisitionItems, 
  requisitionApprovals,
  vendors,
  rfqs,
  rfqItems,
  purchaseOrders,
  deliveries,
  grns,
  jcfs,
  comments,
  notifications,
  locations,
  vendorCategories,
  users,
  departments,
} from "../db/schema";
import { eq } from "drizzle-orm";
import mongoose from "mongoose";

export const syncRequisitionToPostgres = async (reqDoc: any) => {
  try {
    const reqId = reqDoc._id.toString();
    
    // Upsert requisition
    const reqData = {
      id: reqId,
      requisitionNumber: reqDoc.requisitionNumber,
      title: reqDoc.title,
      urgency: reqDoc.urgency,
      justification: reqDoc.justification,
      deliveryLocationId: reqDoc.deliveryLocation?.toString() || reqDoc.deliveryLocation,
      deliveryDate: new Date(reqDoc.deliveryDate),
      paymentStatus: reqDoc.paymentStatus || 'unpaid',
      paymentAmount: reqDoc.paymentAmount ? reqDoc.paymentAmount.toString() : '0',
      paymentDate: reqDoc.paymentDate ? new Date(reqDoc.paymentDate) : null,
      paymentReference: reqDoc.paymentReference,
      paymentNotes: reqDoc.paymentNotes,
      paymentById: reqDoc.paymentBy?.toString(),
      requesterId: reqDoc.requester?.toString() || reqDoc.requester,
      departmentId: reqDoc.department?.toString() || reqDoc.department,
      assignedApproverId: reqDoc.assignedApprover?.toString(),
      status: reqDoc.status || 'draft',
      requestApprovedAt: reqDoc.requestApprovedAt ? new Date(reqDoc.requestApprovedAt) : null,
      poApprovedAt: reqDoc.poApprovedAt ? new Date(reqDoc.poApprovedAt) : null,
      additionalInfo: reqDoc.additionalInfo,
    };
    
    // Delete existing to act as UPSERT cleanly, or use onConflictDoUpdate
    await db.delete(requisitions).where(eq(requisitions.id, reqId));
    await db.insert(requisitions).values(reqData);

    // Sync approvals
    await db.delete(requisitionApprovals).where(eq(requisitionApprovals.requisitionId, reqId));
    if (reqDoc.approvals && reqDoc.approvals.length > 0) {
      const approvalsData = reqDoc.approvals.map((app: any) => ({
        id: app._id ? app._id.toString() : new mongoose.Types.ObjectId().toString(),
        requisitionId: reqId,
        stage: app.stage,
        approverId: app.approver?.toString() || app.approver,
        status: app.status,
        comments: app.comments,
        timestamp: app.timestamp ? new Date(app.timestamp) : new Date(),
      }));
      await db.insert(requisitionApprovals).values(approvalsData);
    }

    // Sync items
    await db.delete(requisitionItems).where(eq(requisitionItems.requisitionId, reqId));
    if (reqDoc.items && reqDoc.items.length > 0) {
      const itemsData = reqDoc.items.map((item: any) => ({
        id: item._id ? item._id.toString() : new mongoose.Types.ObjectId().toString(),
        requisitionId: reqId,
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
        departmentApprovedAt: item.departmentApprovedAt ? new Date(item.departmentApprovedAt) : null,
        departmentRejectedById: item.departmentRejectedBy?.toString(),
        departmentRejectedAt: item.departmentRejectedAt ? new Date(item.departmentRejectedAt) : null,
        departmentComments: item.departmentComments,
        
        hrApprovedById: item.hrApprovedBy?.toString(),
        hrApprovedAt: item.hrApprovedAt ? new Date(item.hrApprovedAt) : null,
        hrRejectedById: item.hrRejectedBy?.toString(),
        hrRejectedAt: item.hrRejectedAt ? new Date(item.hrRejectedAt) : null,
        hrComments: item.hrComments,
        
        hhraApprovedById: item.hhraApprovedBy?.toString(),
        hhraApprovedAt: item.hhraApprovedAt ? new Date(item.hhraApprovedAt) : null,
        hhraRejectedById: item.hhraRejectedBy?.toString(),
        hhraRejectedAt: item.hhraRejectedAt ? new Date(item.hhraRejectedAt) : null,
        hhraComments: item.hhraComments,
        
        procurementComments: item.procurementComments,
        rfqId: item.rfq?.toString(),
        purchaseOrderId: item.purchaseOrder?.toString(),
      }));
      await db.insert(requisitionItems).values(itemsData);
    }
  } catch (err: any) {
    console.error("Failed to sync requisition to Postgres:", err.message);
  }
};

export const syncVendorToPostgres = async (vendorDoc: any) => {
  try {
    const id = vendorDoc._id.toString();
    const data = {
      id,
      name: vendorDoc.name,
      contactPerson: vendorDoc.contactPerson,
      contactPersonDesignation: vendorDoc.contactPersonDesignation || null,
      email: vendorDoc.email,
      phone: vendorDoc.phone,
      address: vendorDoc.address,
      website: vendorDoc.website || null,
      dateOfIncorporation: vendorDoc.dateOfIncorporation ? new Date(vendorDoc.dateOfIncorporation) : null,
      categories: vendorDoc.categories?.map((c: any) => c.toString()) || [],
      documents: vendorDoc.documents || [],
      cacDocument: vendorDoc.cacDocument || null,
      rating: vendorDoc.rating ? vendorDoc.rating.toString() : null,
      isVerified: Boolean(vendorDoc.isVerified),
      isActive: vendorDoc.isActive !== false,
      status: vendorDoc.status || 'pending',
      createdAt: vendorDoc.createdAt ? new Date(vendorDoc.createdAt) : new Date(),
      updatedAt: vendorDoc.updatedAt ? new Date(vendorDoc.updatedAt) : new Date(),
    };
    await db.delete(vendors).where(eq(vendors.id, id));
    await db.insert(vendors).values(data);
  } catch (err: any) {
    console.error("Failed to sync vendor to Postgres:", err.message);
  }
};

export const syncRfqToPostgres = async (rfqDoc: any) => {
  try {
    const id = rfqDoc._id.toString();
    const data = {
      id,
      rfqNumber: rfqDoc.rfqNumber,
      title: rfqDoc.title,
      requisitionId: rfqDoc.requisition?.toString() || rfqDoc.requisition,
      vendors: rfqDoc.vendors?.map((v: any) => v.toString()) || [],
      vendorId: rfqDoc.vendor?.toString() || null,
      relatedPos: rfqDoc.relatedPos?.map((p: any) => p.toString()) || [],
      evaluationCriteria: rfqDoc.evaluationCriteria || null,
      termsAndConditions: rfqDoc.termsAndConditions || null,
      deliveryLocationId: rfqDoc.deliveryLocation?.toString() || rfqDoc.deliveryLocation,
      expectedDeliveryDate: rfqDoc.expectedDeliveryDate ? new Date(rfqDoc.expectedDeliveryDate) : null,
      status: rfqDoc.status || 'draft',
      createdById: rfqDoc.createdBy?.toString() || rfqDoc.createdBy,
      issuedAt: rfqDoc.issuedAt ? new Date(rfqDoc.issuedAt) : null,
      quoteReceivedAt: rfqDoc.quoteReceivedAt ? new Date(rfqDoc.quoteReceivedAt) : null,
      quoteDocument: rfqDoc.quoteDocument || null,
      quoteTotalAmount: rfqDoc.quoteTotalAmount ? rfqDoc.quoteTotalAmount.toString() : null,
      quoteValidUntil: rfqDoc.quoteValidUntil ? new Date(rfqDoc.quoteValidUntil) : null,
      quoteNotes: rfqDoc.quoteNotes || null,
      createdAt: rfqDoc.createdAt ? new Date(rfqDoc.createdAt) : new Date(),
      updatedAt: rfqDoc.updatedAt ? new Date(rfqDoc.updatedAt) : new Date(),
    };

    await db.delete(rfqs).where(eq(rfqs.id, id));
    await db.insert(rfqs).values(data);

    await db.delete(rfqItems).where(eq(rfqItems.rfqId, id));
    if (rfqDoc.items && rfqDoc.items.length > 0) {
      const items = rfqDoc.items.map((item: any) => ({
        id: item._id ? item._id.toString() : new mongoose.Types.ObjectId().toString(),
        rfqId: id,
        itemId: item.itemId?.toString() || item.itemId,
        itemDescription: item.itemDescription,
        detailedSpecification: item.detailedSpecification,
        uom: item.uom,
        quantity: item.quantity ? item.quantity.toString() : "1",
        expectedDeliveryDate: item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate) : new Date(),
        quotedUnitPrice: item.quotedUnitPrice ? item.quotedUnitPrice.toString() : null,
        quotedTotalPrice: item.quotedTotalPrice ? item.quotedTotalPrice.toString() : null,
        vendorComments: item.vendorComments || null,
        createdAt: new Date(),
      }));
      await db.insert(rfqItems).values(items);
    }
  } catch (err: any) {
    console.error("Failed to sync RFQ to Postgres:", err.message);
  }
};

export const syncPurchaseOrderToPostgres = async (poDoc: any) => {
  try {
    const id = poDoc._id.toString();
    const data = {
      id,
      poNumber: poDoc.poNumber,
      title: poDoc.title || null,
      requisitionId: poDoc.requisition?.toString() || poDoc.requisition,
      rfqId: poDoc.rfq?.toString() || null,
      vendorId: poDoc.vendor?.toString() || poDoc.vendor,
      items: poDoc.items || [],
      subtotal: poDoc.subtotal ? poDoc.subtotal.toString() : null,
      discount: poDoc.discount ? poDoc.discount.toString() : null,
      discountType: poDoc.discountType || null,
      discountAmount: poDoc.discountAmount ? poDoc.discountAmount.toString() : null,
      vat: poDoc.vat ? poDoc.vat.toString() : null,
      vatRate: poDoc.vatRate ? poDoc.vatRate.toString() : null,
      vatAmount: poDoc.vatAmount ? poDoc.vatAmount.toString() : null,
      totalAmount: poDoc.totalAmount ? poDoc.totalAmount.toString() : (poDoc.totalPrice ? poDoc.totalPrice.toString() : '0'),
      totalPrice: poDoc.totalPrice ? poDoc.totalPrice.toString() : null,
      deliveryLocationId: poDoc.deliveryLocation?.toString() || poDoc.deliveryLocation,
      deliveryDate: poDoc.deliveryDate ? new Date(poDoc.deliveryDate) : new Date(),
      deliveryContactId: poDoc.deliveryContact?.toString() || null,
      deliveryAddressSnapshot: poDoc.deliveryAddressSnapshot || null,
      shipping: poDoc.shipping || null,
      generalTerms: poDoc.generalTerms || null,
      evaluationCriteria: poDoc.evaluationCriteria || null,
      termsOfService: poDoc.termsOfService || null,
      paymentTerms: poDoc.paymentTerms || null,
      quoteUrl: poDoc.quoteUrl || poDoc.vendorQuote || null,
      vendorQuote: poDoc.vendorQuote || null,
      vendorQuotes: poDoc.vendorQuotes || [],
      approvals: poDoc.approvals || [],
      status: poDoc.status || 'draft',
      createdById: poDoc.createdBy?.toString() || poDoc.createdBy,
      submittedById: poDoc.submittedBy?.toString() || null,
      submittedAt: poDoc.submittedAt ? new Date(poDoc.submittedAt) : null,
      pdfUrl: poDoc.pdfUrl || null,
      serviceClassificationOverride: poDoc.serviceClassificationOverride || null,
      serviceClassificationReason: poDoc.serviceClassificationReason || null,
      createdAt: poDoc.createdAt ? new Date(poDoc.createdAt) : new Date(),
      updatedAt: poDoc.updatedAt ? new Date(poDoc.updatedAt) : new Date(),
    };

    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
    await db.insert(purchaseOrders).values(data);
  } catch (err: any) {
    console.error("Failed to sync Purchase Order to Postgres:", err.message);
  }
};

export const syncDeliveryToPostgres = async (delDoc: any) => {
  try {
    const id = delDoc._id.toString();
    const data = {
      id,
      deliveryNumber: delDoc.deliveryNumber,
      purchaseOrderId: delDoc.purchaseOrder?.toString() || delDoc.purchaseOrder,
      requisitionId: delDoc.requisition?.toString() || delDoc.requisition,
      vendorId: delDoc.vendor?.toString() || delDoc.vendor,
      items: delDoc.items || [],
      status: delDoc.status,
      scheduledDate: delDoc.scheduledDate ? new Date(delDoc.scheduledDate) : null,
      deliveryDate: delDoc.deliveryDate ? new Date(delDoc.deliveryDate) : null,
      receivedById: delDoc.receivedBy?.toString() || null,
      receivedAt: delDoc.receivedAt ? new Date(delDoc.receivedAt) : null,
      notes: delDoc.notes || null,
      trackingNumber: delDoc.trackingNumber || null,
      carrier: delDoc.carrier || null,
      attachments: delDoc.attachments || [],
      requesterVerification: delDoc.requesterVerification || null,
      hodApproval: delDoc.hodApproval || null,
      pmNotification: delDoc.pmNotification || null,
      inventoryVerification: delDoc.inventoryVerification || null,
      departmentVerification: delDoc.departmentVerification || null,
      inventoryConfirmation: delDoc.inventoryConfirmation || null,
      departmentConfirmation: delDoc.departmentConfirmation || null,
      createdAt: delDoc.createdAt ? new Date(delDoc.createdAt) : new Date(),
      updatedAt: delDoc.updatedAt ? new Date(delDoc.updatedAt) : new Date(),
    };
    await db.delete(deliveries).where(eq(deliveries.id, id));
    await db.insert(deliveries).values(data);
  } catch (err: any) {
    console.error("Failed to sync Delivery to Postgres:", err.message);
  }
};

export const syncGrnToPostgres = async (grnDoc: any) => {
  try {
    const id = grnDoc._id.toString();
    const data = {
      id,
      grnNumber: grnDoc.grnNumber,
      purchaseOrderId: grnDoc.purchaseOrder?.toString() || grnDoc.purchaseOrder,
      requisitionId: grnDoc.requisition?.toString() || grnDoc.requisition,
      items: grnDoc.items || [],
      generalRemarks: grnDoc.generalRemarks || null,
      createdById: grnDoc.createdBy?.toString() || grnDoc.createdBy,
      receiverId: grnDoc.receiver?.toString() || grnDoc.receiver,
      approvals: grnDoc.approvals || [],
      status: grnDoc.status,
      deliveredAt: grnDoc.deliveredAt ? new Date(grnDoc.deliveredAt) : null,
      createdAt: grnDoc.createdAt ? new Date(grnDoc.createdAt) : new Date(),
      updatedAt: grnDoc.updatedAt ? new Date(grnDoc.updatedAt) : new Date(),
    };
    await db.delete(grns).where(eq(grns.id, id));
    await db.insert(grns).values(data);
  } catch (err: any) {
    console.error("Failed to sync GRN to Postgres:", err.message);
  }
};

export const syncJcfToPostgres = async (jcfDoc: any) => {
  try {
    const id = jcfDoc._id.toString();
    const data = {
      id,
      jcfNumber: jcfDoc.jcfNumber,
      purchaseOrderId: jcfDoc.purchaseOrder?.toString() || jcfDoc.purchaseOrder,
      requisitionId: jcfDoc.requisition?.toString() || jcfDoc.requisition,
      vendorId: jcfDoc.vendor?.toString() || jcfDoc.vendor,
      createdById: jcfDoc.createdBy?.toString() || jcfDoc.createdBy,
      approverId: jcfDoc.approver?.toString() || null,
      serviceDescription: jcfDoc.serviceDescription || null,
      completionEvidence: jcfDoc.completionEvidence || null,
      rating: jcfDoc.rating ? jcfDoc.rating.toString() : null,
      status: jcfDoc.status,
      approval: jcfDoc.approval || null,
      attachments: jcfDoc.attachments || [],
      pdfUrl: jcfDoc.pdfUrl || null,
      completedAt: jcfDoc.completedAt ? new Date(jcfDoc.completedAt) : null,
      createdAt: jcfDoc.createdAt ? new Date(jcfDoc.createdAt) : new Date(),
      updatedAt: jcfDoc.updatedAt ? new Date(jcfDoc.updatedAt) : new Date(),
    };
    await db.delete(jcfs).where(eq(jcfs.id, id));
    await db.insert(jcfs).values(data);
  } catch (err: any) {
    console.error("Failed to sync JCF to Postgres:", err.message);
  }
};

export const syncCommentToPostgres = async (commentDoc: any) => {
  try {
    const id = commentDoc._id.toString();
    const data = {
      id,
      text: commentDoc.text,
      authorId: commentDoc.author?.toString() || commentDoc.author,
      requisitionId: commentDoc.requisition?.toString() || null,
      bidId: commentDoc.bid?.toString() || null,
      parentCommentId: commentDoc.parentComment?.toString() || null,
      taggedUsers: commentDoc.taggedUsers?.map((u: any) => u.toString()) || [],
      isDeleted: Boolean(commentDoc.isDeleted),
      deletedAt: commentDoc.deletedAt ? new Date(commentDoc.deletedAt) : null,
      createdAt: commentDoc.createdAt ? new Date(commentDoc.createdAt) : new Date(),
      updatedAt: commentDoc.updatedAt ? new Date(commentDoc.updatedAt) : new Date(),
    };
    await db.delete(comments).where(eq(comments.id, id));
    await db.insert(comments).values(data);
  } catch (err: any) {
    console.error("Failed to sync Comment to Postgres:", err.message);
  }
};

export const syncNotificationToPostgres = async (notifDoc: any) => {
  try {
    const id = notifDoc._id.toString();
    const data = {
      id,
      type: notifDoc.type,
      actorId: notifDoc.actor?.toString() || notifDoc.actor,
      actorModel: notifDoc.actorModel || 'User',
      recipientId: notifDoc.recipient?.toString() || notifDoc.recipient,
      recipientModel: notifDoc.recipientModel || 'User',
      resourceKind: notifDoc.resource?.kind || 'requisition',
      resourceId: notifDoc.resource?.id?.toString() || notifDoc.resource?.id,
      commentId: notifDoc.resource?.commentId || null,
      metadata: notifDoc.metadata || null,
      isRead: Boolean(notifDoc.isRead),
      createdAt: notifDoc.createdAt ? new Date(notifDoc.createdAt) : new Date(),
      updatedAt: new Date(),
    };
    await db.delete(notifications).where(eq(notifications.id, id));
    await db.insert(notifications).values(data);
  } catch (err: any) {
    console.error("Failed to sync Notification to Postgres:", err.message);
  }
};

export const syncLocationToPostgres = async (locDoc: any) => {
  try {
    const id = locDoc._id.toString();
    const data = {
      id,
      name: locDoc.name,
      address: locDoc.address || null,
      contactPerson: locDoc.contactPerson || null,
      phoneNumber: locDoc.phoneNumber || null,
      email: locDoc.email || null,
      createdAt: locDoc.createdAt ? new Date(locDoc.createdAt) : new Date(),
      updatedAt: locDoc.updatedAt ? new Date(locDoc.updatedAt) : new Date(),
    };
    await db.delete(locations).where(eq(locations.id, id));
    await db.insert(locations).values(data);
  } catch (err: any) {
    console.error("Failed to sync Location to Postgres:", err.message);
  }
};

export const syncVendorCategoryToPostgres = async (catDoc: any) => {
  try {
    const id = catDoc._id.toString();
    const data = {
      id,
      name: catDoc.name,
      description: catDoc.description || null,
      createdById: catDoc.createdBy?.toString() || null,
      createdAt: catDoc.createdAt ? new Date(catDoc.createdAt) : new Date(),
      updatedAt: catDoc.updatedAt ? new Date(catDoc.updatedAt) : new Date(),
    };
    await db.delete(vendorCategories).where(eq(vendorCategories.id, id));
    await db.insert(vendorCategories).values(data);
  } catch (err: any) {
    console.error("Failed to sync VendorCategory to Postgres:", err.message);
  }
};

export const syncDepartmentToPostgres = async (deptDoc: any) => {
  try {
    const id = deptDoc._id.toString();
    const data = {
      id,
      name: deptDoc.name,
      code: deptDoc.code,
      description: deptDoc.description || null,
      headId: deptDoc.head?.toString() || null,
      createdAt: deptDoc.createdAt ? new Date(deptDoc.createdAt) : new Date(),
      updatedAt: deptDoc.updatedAt ? new Date(deptDoc.updatedAt) : new Date(),
    };
    await db.delete(departments).where(eq(departments.id, id));
    await db.insert(departments).values(data);
  } catch (err: any) {
    console.error("Failed to sync Department to Postgres:", err.message);
  }
};

export const syncUserToPostgres = async (userDoc: any) => {
  try {
    const id = userDoc._id.toString();
    const data = {
      id,
      employeeId: userDoc.employeeId,
      firstName: userDoc.firstName,
      lastName: userDoc.lastName,
      email: userDoc.email,
      password: userDoc.password || null,
      role: userDoc.role || 'STAFF',
      departmentId: userDoc.department?.toString() || null,
      designation: userDoc.designation || 'Staff',
      designationId: userDoc.designationId || 'STAFF',
      profileImage: userDoc.profileImage || null,
      isActive: userDoc.isActive !== false,
      createdAt: userDoc.createdAt ? new Date(userDoc.createdAt) : new Date(),
      updatedAt: userDoc.updatedAt ? new Date(userDoc.updatedAt) : new Date(),
    };
    await db.delete(users).where(eq(users.id, id));
    await db.insert(users).values(data);
  } catch (err: any) {
    console.error("Failed to sync User to Postgres:", err.message);
  }
};
