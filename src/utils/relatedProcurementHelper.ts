import { db } from "../db";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";

export interface RelatedItem {
  _id: string;
  title: string;
  department: string;
}

export interface RelatedPayload {
  requests: RelatedItem[];
  rfqs: RelatedItem[];
  pos: RelatedItem[];
}

export async function getRelatedProcurementItems(options: {
  requisitionId?: string | null;
  rfqId?: string | null;
  poId?: string | null;
}): Promise<RelatedPayload> {
  try {
    let requisitionId = options.requisitionId ? String(options.requisitionId) : null;
    let rfqId = options.rfqId ? String(options.rfqId) : null;
    const poId = options.poId ? String(options.poId) : null;

    // 1. If we only have rfqId, find its requisitionId
    if (!requisitionId && rfqId) {
      const rfqRow = await db.query.rfqs.findFirst({
        where: eq(schema.rfqs.id, rfqId),
      });
      if (rfqRow?.requisitionId) {
        requisitionId = rfqRow.requisitionId;
      }
    }

    // 2. If we only have poId, find its requisitionId and rfqId
    if (!requisitionId && poId) {
      const poRow = await db.query.purchaseOrders.findFirst({
        where: eq(schema.purchaseOrders.id, poId),
      });
      if (poRow?.requisitionId) {
        requisitionId = poRow.requisitionId;
      }
      if (!rfqId && poRow?.rfqId) {
        rfqId = poRow.rfqId;
      }
    }

    // 3. Find the requisition and its department
    let reqTitle = "Request";
    let departmentName = "N/A";

    if (requisitionId) {
      const req = await db.query.requisitions.findFirst({
        where: eq(schema.requisitions.id, requisitionId),
        with: {
          department: true,
        },
      });
      if (req) {
        reqTitle = req.title || req.requisitionNumber || "Request";
        departmentName = req.department?.name || req.department?.code || "N/A";
      }
    }

    // 4. Fetch RFQs
    let rfqRows: any[] = [];
    if (requisitionId) {
      rfqRows = await db
        .select()
        .from(schema.rfqs)
        .where(eq(schema.rfqs.requisitionId, requisitionId));
    } else if (rfqId) {
      rfqRows = await db
        .select()
        .from(schema.rfqs)
        .where(eq(schema.rfqs.id, rfqId));
    }

    // 5. Fetch POs
    let poRows: any[] = [];
    if (requisitionId) {
      poRows = await db
        .select()
        .from(schema.purchaseOrders)
        .where(eq(schema.purchaseOrders.requisitionId, requisitionId));
    } else if (poId) {
      poRows = await db
        .select()
        .from(schema.purchaseOrders)
        .where(eq(schema.purchaseOrders.id, poId));
    }

    const requests: RelatedItem[] = requisitionId
      ? [
          {
            _id: requisitionId,
            title: reqTitle,
            department: departmentName,
          },
        ]
      : [];

    const rfqs: RelatedItem[] = rfqRows.map((r) => ({
      _id: r.id,
      title: r.title || r.rfqNumber || "RFQ",
      department: departmentName,
    }));

    const pos: RelatedItem[] = poRows.map((p) => ({
      _id: p.id,
      title: p.title || p.poNumber || "Purchase Order",
      department: departmentName,
    }));

    return { requests, rfqs, pos };
  } catch (err) {
    console.error("Error getting related procurement items:", err);
    return { requests: [], rfqs: [], pos: [] };
  }
}
