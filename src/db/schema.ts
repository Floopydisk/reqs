import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, varchar, json } from 'drizzle-orm/pg-core';

// Base ID approach: We'll use UUIDs for all primary keys to allow easy migration from Mongo ObjectIDs
// If you want to use the exact same MongoDB ObjectIDs, you can store them as strings in a `legacy_id` column
// or just use 24-char text fields as the primary key. We will use 24-char text fields to match MongoDB.

export const departments = pgTable('departments', {
  id: varchar('id', { length: 24 }).primaryKey(), // Using 24 char string for Mongo ObjectID compatibility
  name: varchar('name', { length: 255 }).notNull().unique(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  description: text('description'),
  headId: varchar('head_id', { length: 24 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const locations = pgTable('locations', {
  id: varchar('id', { length: 24 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  address: text('address'),
  contactPerson: varchar('contact_person', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 50 }),
  email: varchar('email', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const vendorCategories = pgTable('vendor_categories', {
  id: varchar('id', { length: 24 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description'),
  createdById: varchar('created_by_id', { length: 24 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: varchar('id', { length: 24 }).primaryKey(),
  employeeId: varchar('employee_id', { length: 100 }).notNull().unique(),
  firstName: varchar('first_name', { length: 150 }).notNull(),
  lastName: varchar('last_name', { length: 150 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password'),
  role: varchar('role', { length: 50 }).notNull().default('STAFF'),
  departmentId: varchar('department_id', { length: 24 }).references(() => departments.id),
  designation: varchar('designation', { length: 255 }).notNull(),
  designationId: varchar('designation_id', { length: 100 }).notNull(),
  profileImage: text('profile_image'),
  isActive: boolean('is_active').default(true).notNull(),
  isApproved: boolean('is_approved').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relationships
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  head: one(users, {
    fields: [departments.headId],
    references: [users.id],
  }),
  members: many(users),
}));

export const usersRelations = relations(users, ({ one }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
}));

export const vendorCategoriesRelations = relations(vendorCategories, ({ one }) => ({
  createdBy: one(users, {
    fields: [vendorCategories.createdById],
    references: [users.id],
  }),
}));

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

export const vendors = pgTable('vendors', {
  id: varchar('id', { length: 24 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }).notNull(),
  contactPersonDesignation: varchar('contact_person_designation', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 50 }).notNull(),
  address: text('address').notNull(),
  website: varchar('website', { length: 255 }),
  dateOfIncorporation: timestamp('date_of_incorporation'),
  categories: json('categories'),
  documents: json('documents'),
  cacDocument: json('cac_document'),
  rating: varchar('rating', { length: 20 }),
  isVerified: boolean('is_verified').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const rfqs = pgTable('rfqs', {
  id: varchar('id', { length: 24 }).primaryKey(),
  rfqNumber: varchar('rfq_number', { length: 100 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  requisitionId: varchar('requisition_id', { length: 24 }).notNull(),
  vendors: json('vendors'),
  vendorId: varchar('vendor_id', { length: 24 }),
  relatedPos: json('related_pos'),
  evaluationCriteria: text('evaluation_criteria'),
  termsAndConditions: text('terms_and_conditions'),
  deliveryLocationId: varchar('delivery_location_id', { length: 24 }).notNull(),
  expectedDeliveryDate: timestamp('expected_delivery_date'),
  status: varchar('status', { length: 50 }).default('draft').notNull(),
  createdById: varchar('created_by_id', { length: 24 }).notNull(),
  issuedAt: timestamp('issued_at'),
  quoteReceivedAt: timestamp('quote_received_at'),
  quoteDocument: text('quote_document'),
  quoteTotalAmount: varchar('quote_total_amount', { length: 50 }),
  quoteValidUntil: timestamp('quote_valid_until'),
  quoteNotes: text('quote_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const rfqItems = pgTable('rfq_items', {
  id: varchar('id', { length: 24 }).primaryKey(),
  rfqId: varchar('rfq_id', { length: 24 }).notNull(),
  itemId: varchar('item_id', { length: 24 }).notNull(),
  itemDescription: text('item_description').notNull(),
  detailedSpecification: text('detailed_specification').notNull(),
  uom: varchar('uom', { length: 50 }).notNull(),
  quantity: varchar('quantity', { length: 50 }).notNull(),
  expectedDeliveryDate: timestamp('expected_delivery_date').notNull(),
  quotedUnitPrice: varchar('quoted_unit_price', { length: 50 }),
  quotedTotalPrice: varchar('quoted_total_price', { length: 50 }),
  vendorComments: text('vendor_comments'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const purchaseOrders = pgTable('purchase_orders', {
  id: varchar('id', { length: 24 }).primaryKey(),
  poNumber: varchar('po_number', { length: 100 }).notNull().unique(),
  title: varchar('title', { length: 255 }),
  requisitionId: varchar('requisition_id', { length: 24 }).notNull(),
  rfqId: varchar('rfq_id', { length: 24 }),
  vendorId: varchar('vendor_id', { length: 24 }).notNull(),
  items: json('items'),
  subtotal: varchar('subtotal', { length: 50 }),
  discount: varchar('discount', { length: 50 }),
  discountType: varchar('discount_type', { length: 50 }),
  discountAmount: varchar('discount_amount', { length: 50 }),
  vat: varchar('vat', { length: 50 }),
  vatRate: varchar('vat_rate', { length: 50 }),
  vatAmount: varchar('vat_amount', { length: 50 }),
  totalAmount: varchar('total_amount', { length: 50 }).notNull(),
  totalPrice: varchar('total_price', { length: 50 }),
  deliveryLocationId: varchar('delivery_location_id', { length: 24 }).notNull(),
  deliveryDate: timestamp('delivery_date').notNull(),
  deliveryContactId: varchar('delivery_contact_id', { length: 24 }),
  deliveryAddressSnapshot: json('delivery_address_snapshot'),
  shipping: varchar('shipping', { length: 255 }),
  generalTerms: text('general_terms'),
  evaluationCriteria: text('evaluation_criteria'),
  termsOfService: text('terms_of_service'),
  paymentTerms: text('payment_terms'),
  quoteUrl: text('quote_url'),
  vendorQuote: text('vendor_quote'),
  vendorQuotes: json('vendor_quotes'),
  approvals: json('approvals'),
  status: varchar('status', { length: 50 }).default('draft').notNull(),
  createdById: varchar('created_by_id', { length: 24 }).notNull(),
  submittedById: varchar('submitted_by_id', { length: 24 }),
  submittedAt: timestamp('submitted_at'),
  pdfUrl: text('pdf_url'),
  serviceClassificationOverride: text('service_classification_override'),
  serviceClassificationReason: text('service_classification_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const deliveries = pgTable('deliveries', {
  id: varchar('id', { length: 24 }).primaryKey(),
  deliveryNumber: varchar('delivery_number', { length: 100 }).notNull().unique(),
  purchaseOrderId: varchar('purchase_order_id', { length: 24 }).notNull(),
  requisitionId: varchar('requisition_id', { length: 24 }).notNull(),
  vendorId: varchar('vendor_id', { length: 24 }).notNull(),
  items: json('items'),
  status: varchar('status', { length: 50 }).notNull(),
  scheduledDate: timestamp('scheduled_date'),
  deliveryDate: timestamp('delivery_date'),
  receivedById: varchar('received_by_id', { length: 24 }),
  receivedAt: timestamp('received_at'),
  notes: text('notes'),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  carrier: varchar('carrier', { length: 100 }),
  attachments: json('attachments'),
  requesterVerification: json('requester_verification'),
  hodApproval: json('hod_approval'),
  pmNotification: json('pm_notification'),
  inventoryVerification: json('inventory_verification'),
  departmentVerification: json('department_verification'),
  inventoryConfirmation: json('inventory_confirmation'),
  departmentConfirmation: json('department_confirmation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const grns = pgTable('grns', {
  id: varchar('id', { length: 24 }).primaryKey(),
  grnNumber: varchar('grn_number', { length: 100 }).notNull().unique(),
  purchaseOrderId: varchar('purchase_order_id', { length: 24 }).notNull(),
  requisitionId: varchar('requisition_id', { length: 24 }).notNull(),
  items: json('items'),
  generalRemarks: text('general_remarks'),
  createdById: varchar('created_by_id', { length: 24 }).notNull(),
  receiverId: varchar('receiver_id', { length: 24 }).notNull(),
  approvals: json('approvals'),
  status: varchar('status', { length: 50 }).notNull(),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const jcfs = pgTable('jcfs', {
  id: varchar('id', { length: 24 }).primaryKey(),
  jcfNumber: varchar('jcf_number', { length: 100 }).notNull().unique(),
  purchaseOrderId: varchar('purchase_order_id', { length: 24 }).notNull(),
  requisitionId: varchar('requisition_id', { length: 24 }).notNull(),
  vendorId: varchar('vendor_id', { length: 24 }).notNull(),
  createdById: varchar('created_by_id', { length: 24 }).notNull(),
  approverId: varchar('approver_id', { length: 24 }),
  serviceDescription: text('service_description'),
  completionEvidence: text('completion_evidence'),
  rating: varchar('rating', { length: 20 }),
  status: varchar('status', { length: 50 }).notNull(),
  approval: json('approval'),
  attachments: json('attachments'),
  pdfUrl: text('pdf_url'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: varchar('id', { length: 24 }).primaryKey(),
  text: text('text').notNull(),
  authorId: varchar('author_id', { length: 24 }).notNull(),
  requisitionId: varchar('requisition_id', { length: 24 }),
  bidId: varchar('bid_id', { length: 24 }),
  parentCommentId: varchar('parent_comment_id', { length: 24 }),
  taggedUsers: json('tagged_users'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 24 }).primaryKey(),
  type: varchar('type', { length: 100 }).notNull(),
  actorId: varchar('actor_id', { length: 24 }).notNull(),
  actorModel: varchar('actor_model', { length: 50 }).default('User').notNull(),
  recipientId: varchar('recipient_id', { length: 24 }).notNull(),
  recipientModel: varchar('recipient_model', { length: 50 }).default('User').notNull(),
  resourceKind: varchar('resource_kind', { length: 50 }).notNull(),
  resourceId: varchar('resource_id', { length: 24 }).notNull(),
  commentId: varchar('comment_id', { length: 24 }),
  metadata: json('metadata'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

