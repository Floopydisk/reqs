import { db } from './index';
import * as schema from './schema';
import { eq, and, or, ilike, inArray, desc, asc, sql, ne, gte, lte } from 'drizzle-orm';
import * as crypto from 'crypto';

export const generateId = (): string => crypto.randomBytes(12).toString('hex');

// Mapping MongoDB field names to Postgres column names if they differ
const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  requisitions: {
    deliveryLocation: 'deliveryLocationId',
    requester: 'requesterId',
    department: 'departmentId',
    assignedApprover: 'assignedApproverId',
    paymentBy: 'paymentById',
  },
  rfqs: {
    requisition: 'requisitionId',
    vendor: 'vendorId',
    deliveryLocation: 'deliveryLocationId',
    createdBy: 'createdById',
  },
  purchaseOrders: {
    requisition: 'requisitionId',
    rfq: 'rfqId',
    vendor: 'vendorId',
    deliveryLocation: 'deliveryLocationId',
    deliveryContact: 'deliveryContactId',
    createdBy: 'createdById',
    submittedBy: 'submittedById',
  },
  grns: {
    purchaseOrder: 'purchaseOrderId',
    requisition: 'requisitionId',
    createdBy: 'createdById',
    receiver: 'receiverId',
  },
  jcfs: {
    purchaseOrder: 'purchaseOrderId',
    requisition: 'requisitionId',
    vendor: 'vendorId',
    createdBy: 'createdById',
    approver: 'approverId',
  },
  deliveries: {
    purchaseOrder: 'purchaseOrderId',
    requisition: 'requisitionId',
    vendor: 'vendorId',
    receivedBy: 'receivedById',
  },
  comments: {
    author: 'authorId',
    requisition: 'requisitionId',
    parentComment: 'parentCommentId',
  },
  notifications: {
    actor: 'actorId',
    recipient: 'recipientId',
  },
  departments: {
    head: 'headId',
  },
  vendorCategories: {
    createdBy: 'createdById',
  },
  requisitionHistory: {
    requisition: 'requisitionId',
    user: 'userId',
  },
  itemHistory: {
    requisition: 'requisitionId',
  },
  users: {
    department: 'departmentId',
  },
};

// Reverse mappings: Postgres column name to MongoDB virtual field name
const REVERSE_FIELD_MAPPINGS: Record<string, Record<string, string>> = {};
for (const [table, mappings] of Object.entries(FIELD_MAPPINGS)) {
  REVERSE_FIELD_MAPPINGS[table] = {};
  for (const [mongoField, pgField] of Object.entries(mappings)) {
    REVERSE_FIELD_MAPPINGS[table][pgField] = mongoField;
  }
}

/**
 * Creates a PostgreSQL-backed Mongoose-compatible model
 */
export function createPgModel<T = any>(
  tableName: keyof typeof schema,
  options: {
    defaultSort?: Record<string, 1 | -1>;
    primaryKey?: string;
  } = {}
) {
  const table = schema[tableName] as any;
  const mappings = FIELD_MAPPINGS[tableName as string] || {};
  const revMappings = REVERSE_FIELD_MAPPINGS[tableName as string] || {};

  function mapFieldToColumn(field: string): string {
    if (field === '_id') return 'id';
    return mappings[field] || field;
  }

  function sanitizeValueForColumn(column: any, val: any): any {
    if (val === undefined || val === null) return val;
    if (column && (column.columnType === 'PgTimestamp' || column.dataType === 'date')) {
      if (typeof val === 'string' || typeof val === 'number') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      }
    }
    return val;
  }

  function wrapDocument(data: any): any {
    if (!data) return null;
    const doc: any = { ...data };

    // Guarantee _id and id are always present
    if (doc.id && !doc._id) doc._id = doc.id;
    if (doc._id && !doc.id) doc.id = doc._id;

    // Attach virtual fields for foreign keys (e.g. doc.department = doc.departmentId)
    for (const [pgCol, mongoField] of Object.entries(revMappings)) {
      if (doc[pgCol] !== undefined && doc[mongoField] === undefined) {
        doc[mongoField] = doc[pgCol];
      }
    }

    // Attach Mongoose document helper methods
    doc.toObject = function () {
      const obj: any = {};
      for (const k of Object.keys(this)) {
        if (typeof this[k] !== 'function' && !k.startsWith('_$')) {
          obj[k] = this[k];
        }
      }
      return obj;
    };

    doc.toJSON = function () {
      return this.toObject();
    };

    doc.populate = async function (path: string | any, select?: string) {
      const paths = Array.isArray(path) ? path : [path];
      for (const p of paths) {
        const pathName = typeof p === 'string' ? p : p.path;
        await populateDocField(this, pathName, tableName as string);
      }
      return this;
    };

    doc.save = async function () {
      const id = this.id || this._id;
      // Persist main record to Postgres
      const updateData: any = {};
      for (const key of Object.keys(table)) {
        if (this[key] !== undefined && typeof this[key] !== 'function') {
          updateData[key] = sanitizeValueForColumn((table as any)[key], this[key]);
        }
      }
      // Also check if virtuals were modified
      for (const [mongoField, pgCol] of Object.entries(mappings)) {
        if (this[mongoField] !== undefined) {
          const val = typeof this[mongoField] === 'object' && this[mongoField]?._id
            ? this[mongoField]._id
            : this[mongoField];
          updateData[pgCol] = val ? String(val) : null;
        }
      }

      if (id) {
        updateData.updatedAt = new Date();
        delete updateData.id;
        await db.update(table).set(updateData).where(eq(table.id, id));
      } else {
        const newId = generateId();
        this.id = newId;
        this._id = newId;
        updateData.id = newId;
        updateData.createdAt = new Date();
        updateData.updatedAt = new Date();
        await db.insert(table).values(updateData);
      }

      // Handle child tables for special models
      if (tableName === 'requisitions') {
        await saveRequisitionChildren(this);
      } else if (tableName === 'rfqs') {
        await saveRfqChildren(this);
      }

      return this;
    };

    doc.deleteOne = async function () {
      const id = this.id || this._id;
      if (id) {
        await db.delete(table).where(eq(table.id, id));
        if (tableName === 'requisitions') {
          await db.delete(schema.requisitionItems).where(eq(schema.requisitionItems.requisitionId, id));
          await db.delete(schema.requisitionApprovals).where(eq(schema.requisitionApprovals.requisitionId, id));
        } else if (tableName === 'rfqs') {
          await db.delete(schema.rfqItems).where(eq(schema.rfqItems.rfqId, id));
        }
      }
      return this;
    };
    doc.remove = doc.deleteOne;

    return doc;
  }

  function buildWhere(filter: any): any[] {
    if (!filter || Object.keys(filter).length === 0) return [];
    const conditions: any[] = [];

    for (const [key, rawValue] of Object.entries(filter)) {
      if (rawValue === undefined) continue;

      if (key === '$or' && Array.isArray(rawValue)) {
        const orConds = rawValue.map(sub => {
          const subConds = buildWhere(sub);
          return subConds.length === 1 ? subConds[0] : and(...subConds);
        }).filter(Boolean);
        if (orConds.length > 0) conditions.push(or(...orConds));
        continue;
      }

      const colName = mapFieldToColumn(key);
      const column = table[colName];
      if (!column) continue;

      const value = rawValue as any;
      if (value && typeof value === 'object') {
        if (value instanceof RegExp) {
          const pattern = value.source.replace(/[\^$]/g, '').replace(/\\d\+/g, '%').replace(/\\d\{[0-9]+\}/g, '%') + '%';
          conditions.push(ilike(column, pattern));
        } else if (value.$in && Array.isArray(value.$in)) {
          const vals = value.$in.map((v: any) => String(v?._id || v));
          if (vals.length > 0) conditions.push(inArray(column, vals));
        } else if (value.$ne !== undefined) {
          conditions.push(ne(column, value.$ne));
        } else if (value.$regex) {
          const regStr = typeof value.$regex === 'string' ? value.$regex : value.$regex.source;
          const pattern = regStr.replace(/[\^$]/g, '').replace(/\\d\+/g, '%') + '%';
          conditions.push(ilike(column, pattern));
        } else if (value.$gte !== undefined && value.$lte !== undefined) {
          conditions.push(and(gte(column, value.$gte), lte(column, value.$lte)));
        } else if (value.$gte !== undefined) {
          conditions.push(gte(column, value.$gte));
        } else if (value.$lte !== undefined) {
          conditions.push(lte(column, value.$lte));
        } else if (value._id) {
          conditions.push(eq(column, String(value._id)));
        }
      } else {
        // Direct equality
        conditions.push(eq(column, value as any));
      }
    }

    return conditions;
  }

  class QueryChain implements PromiseLike<any> {
    private _filter: any;
    private _populates: string[] = [];
    private _sortObj: any = options.defaultSort || null;
    private _limitNum: number | null = null;
    private _skipNum: number | null = null;
    private _selectFields: string[] | null = null;
    private _isLean = false;
    private _single = false;

    constructor(filter: any, single = false) {
      this._filter = filter;
      this._single = single;
    }

    populate(path: string | any, select?: string): this {
      const paths = Array.isArray(path) ? path : [path];
      for (const p of paths) {
        const name = typeof p === 'string' ? p : p?.path;
        if (name) this._populates.push(name);
      }
      return this;
    }

    sort(sortObj: any): this {
      this._sortObj = sortObj;
      return this;
    }

    skip(n: number): this {
      this._skipNum = n;
      return this;
    }

    limit(n: number): this {
      this._limitNum = n;
      return this;
    }

    select(fields: any): this {
      if (typeof fields === 'string') {
        this._selectFields = fields.split(/\s+/).filter(Boolean);
      }
      return this;
    }

    lean(): this {
      this._isLean = true;
      return this;
    }

    session(_sess?: any): this {
      return this;
    }

    async exec(): Promise<any> {
      return this.execute();
    }

    then<TResult1 = any, TResult2 = never>(
      onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
      return this.execute().then(onfulfilled, onrejected);
    }

    catch(reject: any): Promise<any> {
      return this.execute().catch(reject);
    }

    private async execute(): Promise<any> {
      try {
        const conds = buildWhere(this._filter);
        const whereClause = conds.length > 0 ? (conds.length === 1 ? conds[0] : and(...conds)) : undefined;

        let query = db.select().from(table);
        if (whereClause) {
          query = query.where(whereClause) as any;
        }

        // Sorting
        if (this._sortObj) {
          const orderClauses: any[] = [];
          for (const [f, dir] of Object.entries(this._sortObj)) {
            const col = table[mapFieldToColumn(f)];
            if (col) {
              orderClauses.push(dir === 1 || dir === 'asc' ? asc(col) : desc(col));
            }
          }
          if (orderClauses.length > 0) {
            query = query.orderBy(...orderClauses) as any;
          }
        } else if (table.createdAt) {
          query = query.orderBy(desc(table.createdAt)) as any;
        }

        if (this._limitNum !== null) {
          query = query.limit(this._limitNum) as any;
        }
        if (this._skipNum !== null) {
          query = query.offset(this._skipNum) as any;
        }

        const rows = await query;

        if (this._single) {
          const row = rows[0] || null;
          if (!row) return null;
          const doc = wrapDocument(row);
          if (tableName === 'requisitions') {
            await loadRequisitionChildren(doc);
          } else if (tableName === 'rfqs') {
            await loadRfqChildren(doc);
          }
          for (const p of this._populates) {
            await populateDocField(doc, p, tableName as string);
          }
          return this._isLean ? doc.toObject() : doc;
        }

        const docs = await Promise.all(
          rows.map(async r => {
            const d = wrapDocument(r);
            if (tableName === 'requisitions') {
              await loadRequisitionChildren(d);
            } else if (tableName === 'rfqs') {
              await loadRfqChildren(d);
            }
            for (const p of this._populates) {
              await populateDocField(d, p, tableName as string);
            }
            return this._isLean ? d.toObject() : d;
          })
        );

        return docs;
      } catch (err) {
        console.error(`Error in PgModel.${tableName}.execute:`, err);
        throw err;
      }
    }
  }

  return {
    find(filter: any = {}) {
      return new QueryChain(filter, false);
    },

    findById(id: any) {
      const cleanId = id?._id ? String(id._id) : String(id);
      return new QueryChain({ _id: cleanId }, true);
    },

    findOne(filter: any = {}) {
      return new QueryChain(filter, true);
    },

    async create(data: any): Promise<any> {
      const id = data.id || data._id || generateId();
      const insertData: any = { id };

      for (const key of Object.keys(table)) {
        if (data[key] !== undefined && typeof data[key] !== 'function') {
          insertData[key] = sanitizeValueForColumn((table as any)[key], data[key]);
        }
      }

      for (const [mongoField, pgCol] of Object.entries(mappings)) {
        if (data[mongoField] !== undefined) {
          const val = typeof data[mongoField] === 'object' && data[mongoField]?._id
            ? data[mongoField]._id
            : data[mongoField];
          insertData[pgCol] = val ? String(val) : null;
        }
      }

      if (table.createdAt && !insertData.createdAt) insertData.createdAt = new Date();
      if (table.updatedAt && !insertData.updatedAt) insertData.updatedAt = new Date();

      await db.insert(table).values(insertData);

      const doc = wrapDocument({ ...insertData, id });

      if (tableName === 'requisitions') {
        doc.items = data.items || [];
        doc.approvals = data.approvals || [];
        await saveRequisitionChildren(doc);
      } else if (tableName === 'rfqs') {
        doc.items = data.items || [];
        await saveRfqChildren(doc);
      }

      return doc;
    },

    async insertMany(docs: any[]): Promise<any[]> {
      return Promise.all(docs.map(d => this.create(d)));
    },

    async findByIdAndUpdate(id: any, update: any, options: any = {}): Promise<any> {
      const cleanId = id?._id ? String(id._id) : String(id);
      const updateData: any = {};
      const updates = update?.$set || update || {};

      for (const key of Object.keys(table)) {
        if (updates[key] !== undefined && typeof updates[key] !== 'function') {
          updateData[key] = sanitizeValueForColumn((table as any)[key], updates[key]);
        }
      }

      for (const [mongoField, pgCol] of Object.entries(mappings)) {
        if (updates[mongoField] !== undefined) {
          const val = typeof updates[mongoField] === 'object' && updates[mongoField]?._id
            ? updates[mongoField]._id
            : updates[mongoField];
          updateData[pgCol] = val ? String(val) : null;
        }
      }

      if (table.updatedAt) updateData.updatedAt = new Date();
      delete updateData.id;

      if (Object.keys(updateData).length > 0) {
        await db.update(table).set(updateData).where(eq(table.id, cleanId));
      }

      const updated = await this.findById(cleanId);
      if (updated && (updates.items || updates.approvals)) {
        if (updates.items) updated.items = updates.items;
        if (updates.approvals) updated.approvals = updates.approvals;
        if (tableName === 'requisitions') await saveRequisitionChildren(updated);
        else if (tableName === 'rfqs') await saveRfqChildren(updated);
      }

      return updated;
    },

    async findOneAndUpdate(filter: any, update: any, options: any = {}): Promise<any> {
      const existing = await this.findOne(filter);
      if (!existing) return null;
      return this.findByIdAndUpdate(existing.id, update, options);
    },

    async findByIdAndDelete(id: any): Promise<any> {
      const cleanId = id?._id ? String(id._id) : String(id);
      const existing = await this.findById(cleanId);
      if (existing) {
        await db.delete(table).where(eq(table.id, cleanId));
        if (tableName === 'requisitions') {
          await db.delete(schema.requisitionItems).where(eq(schema.requisitionItems.requisitionId, cleanId));
          await db.delete(schema.requisitionApprovals).where(eq(schema.requisitionApprovals.requisitionId, cleanId));
        } else if (tableName === 'rfqs') {
          await db.delete(schema.rfqItems).where(eq(schema.rfqItems.rfqId, cleanId));
        }
      }
      return existing;
    },

    async findOneAndDelete(filter: any): Promise<any> {
      const existing = await this.findOne(filter);
      if (!existing) return null;
      return this.findByIdAndDelete(existing.id);
    },

    async countDocuments(filter: any = {}): Promise<number> {
      const conds = buildWhere(filter);
      const whereClause = conds.length > 0 ? (conds.length === 1 ? conds[0] : and(...conds)) : undefined;

      let query = db.select({ count: sql<number>`count(*)` }).from(table);
      if (whereClause) {
        query = query.where(whereClause) as any;
      }
      const res = await query;
      return Number(res[0]?.count || 0);
    },

    async deleteMany(filter: any = {}): Promise<{ deletedCount: number }> {
      const conds = buildWhere(filter);
      const whereClause = conds.length > 0 ? (conds.length === 1 ? conds[0] : and(...conds)) : undefined;

      if (!whereClause) {
        await db.delete(table);
        return { deletedCount: 0 };
      }
      const existing = await db.select({ id: table.id }).from(table).where(whereClause);
      await db.delete(table).where(whereClause);
      return { deletedCount: existing.length };
    },

    async updateMany(filter: any, update: any): Promise<{ modifiedCount: number }> {
      const conds = buildWhere(filter);
      const whereClause = conds.length > 0 ? (conds.length === 1 ? conds[0] : and(...conds)) : undefined;
      const updates = update?.$set || update || {};
      const updateData: any = {};
      for (const k of Object.keys(table)) {
        if (updates[k] !== undefined) updateData[k] = updates[k];
      }
      if (table.updatedAt) updateData.updatedAt = new Date();

      if (whereClause) {
        await db.update(table).set(updateData).where(whereClause);
      }
      return { modifiedCount: 1 };
    },

    async distinct(field: string, filter: any = {}): Promise<any[]> {
      const col = table[mapFieldToColumn(field)];
      if (!col) return [];
      const conds = buildWhere(filter);
      const whereClause = conds.length > 0 ? (conds.length === 1 ? conds[0] : and(...conds)) : undefined;

      let query = db.selectDistinct({ val: col }).from(table);
      if (whereClause) query = query.where(whereClause) as any;
      const rows = await query;
      return rows.map(r => r.val).filter(Boolean);
    },

    async aggregate(pipeline: any[]): Promise<any[]> {
      return [];
    }
  };
}

/**
 * Child table helpers for Requisition
 */
async function loadRequisitionChildren(reqDoc: any) {
  if (!reqDoc || !reqDoc.id) return;
  const items = await db.select().from(schema.requisitionItems).where(eq(schema.requisitionItems.requisitionId, reqDoc.id));
  const approvals = await db.select().from(schema.requisitionApprovals).where(eq(schema.requisitionApprovals.requisitionId, reqDoc.id));

  reqDoc.items = items.map(i => ({
    ...i,
    _id: i.id,
    recommendedVendor: i.recommendedVendorId,
    departmentApprovedBy: i.departmentApprovedById,
    departmentRejectedBy: i.departmentRejectedById,
    hrApprovedBy: i.hrApprovedById,
    hrRejectedBy: i.hrRejectedById,
    hhraApprovedBy: i.hhraApprovedById,
    hhraRejectedBy: i.hhraRejectedById,
  }));

  reqDoc.approvals = approvals.map(a => ({
    ...a,
    _id: a.id,
    approver: a.approverId,
  }));
}

async function saveRequisitionChildren(reqDoc: any) {
  if (!reqDoc || !reqDoc.id) return;
  const reqId = reqDoc.id;

  if (Array.isArray(reqDoc.items)) {
    await db.delete(schema.requisitionItems).where(eq(schema.requisitionItems.requisitionId, reqId));
    if (reqDoc.items.length > 0) {
      const itemsData = reqDoc.items.map((item: any) => ({
        id: item.id || item._id ? String(item.id || item._id) : generateId(),
        requisitionId: reqId,
        itemName: item.itemName || 'Unnamed Item',
        itemType: item.itemType || 'Product',
        preferredBrand: item.preferredBrand || null,
        itemDescription: item.itemDescription || '',
        uploadImage: item.uploadImage || null,
        units: item.units ? String(item.units) : null,
        UOM: item.UOM || null,
        recommendedVendorId: item.recommendedVendor ? String(item.recommendedVendor?._id || item.recommendedVendor) : null,
        isWorkTool: Boolean(item.isWorkTool),
        status: item.status || 'pending',
        departmentApprovedById: item.departmentApprovedBy ? String(item.departmentApprovedBy?._id || item.departmentApprovedBy) : null,
        departmentApprovedAt: item.departmentApprovedAt ? new Date(item.departmentApprovedAt) : null,
        departmentRejectedById: item.departmentRejectedBy ? String(item.departmentRejectedBy?._id || item.departmentRejectedBy) : null,
        departmentRejectedAt: item.departmentRejectedAt ? new Date(item.departmentRejectedAt) : null,
        departmentComments: item.departmentComments || null,
        hrApprovedById: item.hrApprovedBy ? String(item.hrApprovedBy?._id || item.hrApprovedBy) : null,
        hrApprovedAt: item.hrApprovedAt ? new Date(item.hrApprovedAt) : null,
        hrRejectedById: item.hrRejectedBy ? String(item.hrRejectedBy?._id || item.hrRejectedBy) : null,
        hrRejectedAt: item.hrRejectedAt ? new Date(item.hrRejectedAt) : null,
        hrComments: item.hrComments || null,
        hhraApprovedById: item.hhraApprovedBy ? String(item.hhraApprovedBy?._id || item.hhraApprovedBy) : null,
        hhraApprovedAt: item.hhraApprovedAt ? new Date(item.hhraApprovedAt) : null,
        hhraRejectedById: item.hhraRejectedBy ? String(item.hhraRejectedBy?._id || item.hhraRejectedBy) : null,
        hhraRejectedAt: item.hhraRejectedAt ? new Date(item.hhraRejectedAt) : null,
        hhraComments: item.hhraComments || null,
        procurementComments: item.procurementComments || null,
        rfqId: item.rfq ? String(item.rfq?._id || item.rfq) : null,
        purchaseOrderId: item.purchaseOrder ? String(item.purchaseOrder?._id || item.purchaseOrder) : null,
      }));
      await db.insert(schema.requisitionItems).values(itemsData);
      reqDoc.items = itemsData.map((it: any) => ({
        ...it,
        _id: it.id,
      }));
    }
  }

  if (Array.isArray(reqDoc.approvals)) {
    await db.delete(schema.requisitionApprovals).where(eq(schema.requisitionApprovals.requisitionId, reqId));
    if (reqDoc.approvals.length > 0) {
      const approvalsData = reqDoc.approvals.map((app: any) => ({
        id: app.id || app._id ? String(app.id || app._id) : generateId(),
        requisitionId: reqId,
        stage: app.stage,
        approverId: String(app.approver?._id || app.approver),
        status: app.status,
        comments: app.comments || null,
        timestamp: app.timestamp ? new Date(app.timestamp) : new Date(),
      }));
      await db.insert(schema.requisitionApprovals).values(approvalsData);
      reqDoc.approvals = approvalsData.map((ap: any) => ({
        ...ap,
        _id: ap.id,
      }));
    }
  }
}

/**
 * Child table helpers for RFQ
 */
async function loadRfqChildren(rfqDoc: any) {
  if (!rfqDoc || !rfqDoc.id) return;
  const items = await db.select().from(schema.rfqItems).where(eq(schema.rfqItems.rfqId, rfqDoc.id));
  rfqDoc.items = items.map(i => ({
    ...i,
    _id: i.id,
  }));
}

async function saveRfqChildren(rfqDoc: any) {
  if (!rfqDoc || !rfqDoc.id || !Array.isArray(rfqDoc.items)) return;
  const rfqId = rfqDoc.id;
  await db.delete(schema.rfqItems).where(eq(schema.rfqItems.rfqId, rfqId));
  if (rfqDoc.items.length > 0) {
    const itemsData = rfqDoc.items.map((item: any) => ({
      id: item.id || item._id ? String(item.id || item._id) : generateId(),
      rfqId,
      itemId: String(item.itemId?._id || item.itemId),
      itemDescription: item.itemDescription || '',
      detailedSpecification: item.detailedSpecification || null,
      uom: item.uom || null,
      quantity: item.quantity ? String(item.quantity) : '1',
      expectedDeliveryDate: item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate) : new Date(),
      quotedUnitPrice: item.quotedUnitPrice ? String(item.quotedUnitPrice) : null,
      quotedTotalPrice: item.quotedTotalPrice ? String(item.quotedTotalPrice) : null,
      vendorComments: item.vendorComments || null,
    }));
    await db.insert(schema.rfqItems).values(itemsData);
    rfqDoc.items = itemsData.map((it: any) => ({
      ...it,
      _id: it.id,
    }));
  }
}

/**
 * Relation Populator
 */
async function populateDocField(doc: any, path: string, currentTable: string) {
  if (!doc) return;

  const targetId = doc[path]?._id || doc[path] || doc[`${path}Id`];

  if (path === 'department') {
    if (targetId) {
      const dept = await db.select().from(schema.departments).where(eq(schema.departments.id, String(targetId)));
      if (dept[0]) {
        doc.department = { ...dept[0], _id: dept[0].id };
      }
    }
  } else if (['requester', 'createdBy', 'submittedBy', 'approver', 'receiver', 'head', 'author', 'actor', 'recipient', 'deliveryContact', 'assignedApprover', 'paymentBy'].includes(path)) {
    if (targetId) {
      const usr = await db.select().from(schema.users).where(eq(schema.users.id, String(targetId)));
      if (usr[0]) {
        doc[path] = { ...usr[0], _id: usr[0].id };
      }
    }
  } else if (path === 'deliveryLocation') {
    if (targetId) {
      const loc = await db.select().from(schema.locations).where(eq(schema.locations.id, String(targetId)));
      if (loc[0]) {
        doc.deliveryLocation = { ...loc[0], _id: loc[0].id };
      }
    }
  } else if (path === 'vendor') {
    if (targetId) {
      const vend = await db.select().from(schema.vendors).where(eq(schema.vendors.id, String(targetId)));
      if (vend[0]) {
        doc.vendor = { ...vend[0], _id: vend[0].id };
      }
    }
  } else if (path === 'categories' && Array.isArray(doc.categories)) {
    if (doc.categories.length > 0) {
      const catIds = doc.categories.map((c: any) => String(c?._id || c));
      const cats = await db.select().from(schema.vendorCategories).where(inArray(schema.vendorCategories.id, catIds));
      doc.categories = cats.map(c => ({ ...c, _id: c.id }));
    }
  } else if (path === 'requisition') {
    if (targetId) {
      const req = await db.select().from(schema.requisitions).where(eq(schema.requisitions.id, String(targetId)));
      if (req[0]) {
        const reqDoc = { ...req[0], _id: req[0].id };
        await loadRequisitionChildren(reqDoc);
        doc.requisition = reqDoc;
      }
    }
  } else if (path === 'purchaseOrder') {
    if (targetId) {
      const po = await db.select().from(schema.purchaseOrders).where(eq(schema.purchaseOrders.id, String(targetId)));
      if (po[0]) {
        doc.purchaseOrder = { ...po[0], _id: po[0].id };
      }
    }
  } else if (path === 'rfq') {
    if (targetId) {
      const rfq = await db.select().from(schema.rfqs).where(eq(schema.rfqs.id, String(targetId)));
      if (rfq[0]) {
        const rfqDoc = { ...rfq[0], _id: rfq[0].id };
        await loadRfqChildren(rfqDoc);
        doc.rfq = rfqDoc;
      }
    }
  }
}
