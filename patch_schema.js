const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

const newTables = `
export const requisitions = pgTable('requisitions', {
  id: varchar('id', { length: 24 }).primaryKey(),
  requisitionNumber: varchar('requisition_number', { length: 100 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  urgency: varchar('urgency', { length: 50 }),
  justification: text('justification').notNull(),
  deliveryLocationId: varchar('delivery_location_id', { length: 24 }).notNull(), // refs locations.id
  deliveryDate: timestamp('delivery_date').notNull(),
  paymentStatus: varchar('payment_status', { length: 50 }).default('unpaid'),
  paymentAmount: varchar('payment_amount', { length: 50 }).default('0'), // using varchar for numeric to avoid precision issues initially or numeric
  paymentDate: timestamp('payment_date'),
  paymentReference: varchar('payment_reference', { length: 255 }),
  paymentNotes: text('payment_notes'),
  paymentById: varchar('payment_by_id', { length: 24 }),
  requesterId: varchar('requester_id', { length: 24 }).notNull(),
  departmentId: varchar('department_id', { length: 24 }).notNull(),
  assignedApproverId: varchar('assigned_approver_id', { length: 24 }),
  status: varchar('status', { length: 50 }).default('draft'),
  requestApprovedAt: timestamp('request_approved_at'),
  poApprovedAt: timestamp('po_approved_at'),
  additionalInfo: text('additional_info'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const requisitionApprovals = pgTable('requisition_approvals', {
  id: varchar('id', { length: 24 }).primaryKey(),
  requisitionId: varchar('requisition_id', { length: 24 }).notNull(),
  stage: varchar('stage', { length: 100 }).notNull(),
  approverId: varchar('approver_id', { length: 24 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  comments: text('comments'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const requisitionItems = pgTable('requisition_items', {
  id: varchar('id', { length: 24 }).primaryKey(),
  requisitionId: varchar('requisition_id', { length: 24 }).notNull(),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  itemType: varchar('item_type', { length: 50 }).notNull(),
  preferredBrand: varchar('preferred_brand', { length: 255 }),
  itemDescription: text('item_description').notNull(),
  uploadImage: text('upload_image'),
  units: varchar('units', { length: 50 }),
  UOM: varchar('uom', { length: 50 }),
  recommendedVendorId: varchar('recommended_vendor_id', { length: 24 }),
  isWorkTool: boolean('is_work_tool').default(false).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  
  departmentApprovedById: varchar('department_approved_by_id', { length: 24 }),
  departmentApprovedAt: timestamp('department_approved_at'),
  departmentRejectedById: varchar('department_rejected_by_id', { length: 24 }),
  departmentRejectedAt: timestamp('department_rejected_at'),
  departmentComments: text('department_comments'),

  hrApprovedById: varchar('hr_approved_by_id', { length: 24 }),
  hrApprovedAt: timestamp('hr_approved_at'),
  hrRejectedById: varchar('hr_rejected_by_id', { length: 24 }),
  hrRejectedAt: timestamp('hr_rejected_at'),
  hrComments: text('hr_comments'),

  hhraApprovedById: varchar('hhra_approved_by_id', { length: 24 }),
  hhraApprovedAt: timestamp('hhra_approved_at'),
  hhraRejectedById: varchar('hhra_rejected_by_id', { length: 24 }),
  hhraRejectedAt: timestamp('hhra_rejected_at'),
  hhraComments: text('hhra_comments'),

  procurementComments: text('procurement_comments'),
  rfqId: varchar('rfq_id', { length: 24 }),
  purchaseOrderId: varchar('purchase_order_id', { length: 24 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const requisitionsRelations = relations(requisitions, ({ one, many }) => ({
  requester: one(users, {
    fields: [requisitions.requesterId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [requisitions.departmentId],
    references: [departments.id],
  }),
  deliveryLocation: one(locations, {
    fields: [requisitions.deliveryLocationId],
    references: [locations.id],
  }),
  assignedApprover: one(users, {
    fields: [requisitions.assignedApproverId],
    references: [users.id],
  }),
  paymentBy: one(users, {
    fields: [requisitions.paymentById],
    references: [users.id],
  }),
  approvals: many(requisitionApprovals),
  items: many(requisitionItems),
}));

export const requisitionApprovalsRelations = relations(requisitionApprovals, ({ one }) => ({
  requisition: one(requisitions, {
    fields: [requisitionApprovals.requisitionId],
    references: [requisitions.id],
  }),
  approver: one(users, {
    fields: [requisitionApprovals.approverId],
    references: [users.id],
  }),
}));

export const requisitionItemsRelations = relations(requisitionItems, ({ one }) => ({
  requisition: one(requisitions, {
    fields: [requisitionItems.requisitionId],
    references: [requisitions.id],
  }),
}));

`;

code += newTables;
fs.writeFileSync('src/db/schema.ts', code);
