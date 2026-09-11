import { EventEmitter } from "events";
import mongoose from "mongoose";
import User from "../models/user.model";
import Vendor from "../models/vendor.model";
import Notification from "../models/notification.model";
import emailService from "./emailService";
import { toObjectId } from "./objectIdHelper";

export type NotificationType =
  | "comment_created"
  | "comment_replied"
  | "comment_tagged"
  | "requisition_status_changed"
  | "bid_selected"
  | "vendor_shortlisted"
  | "meeting_scheduled"
  | "delivery_reminder"
  | "delivery_late"
  | "delivery_confirmed"
  | "payment_status_updated"
  | "bid_deadline_extended";

export interface NotificationPayload {
  type: NotificationType;
  actorId: string;
  actorModel?: "User" | "Vendor";
  targetUserIds?: string[];
  targetVendorIds?: string[];
  resource: {
    kind: "requisition" | "bid" | "delivery" | "negotiation" | "purchaseOrder";
    id: string;
    commentId?: string;
  };
  metadata?: Record<string, any>;
}

export const notifications = new EventEmitter();

function buildResourceUrl(
  kind: "requisition" | "bid" | "delivery" | "negotiation" | "purchaseOrder",
  id: string
): string {
  const base = process.env.APP_URL || process.env.FRONTEND_URL || "";
  let path = "";

  switch (kind) {
    case "requisition":
      path = `/requisitions/${id}`;
      break;
    case "bid":
      path = `/bids/${id}`;
      break;
    case "delivery":
      path = `/deliveries/${id}`;
      break;
    case "negotiation":
      path = `/negotiations/${id}`;
      break;
    case "purchaseOrder":
      path = `/purchase-orders/${id}`;
      break;
    default:
      path = `/requisitions/${id}`;
  }

  return base ? `${base}${path}` : path;
}

function buildEmail(
  payload: NotificationPayload,
  actor?: any
): { subject: string; html: string } {
  const url = buildResourceUrl(payload.resource.kind, payload.resource.id);
  const actorName = actor
    ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim()
    : "Someone";
  const preview = (payload.metadata?.text || "").toString();
  const previewShort =
    preview.length > 240 ? `${preview.slice(0, 240)}…` : preview;
  const resourceNumber = payload.metadata?.resourceNumber || "";

  switch (payload.type) {
    case "comment_tagged":
      return {
        subject: `You were mentioned in a comment`,
        html: `
          <h2>${actorName} mentioned you</h2>
          <p>${previewShort || "You were tagged in a conversation."}</p>
          <p><a href="${url}">Open in app</a></p>
        `,
      };

    case "comment_replied":
      return {
        subject: `New reply to your comment`,
        html: `
          <h2>${actorName} replied to your comment</h2>
          <p>${previewShort || "There is a new reply in the thread."}</p>
          <p><a href="${url}">Open in app</a></p>
        `,
      };

    case "comment_created":
      return {
        subject: `New comment`,
        html: `
          <h2>${actorName} added a comment</h2>
          <p>${previewShort || "A new comment was posted."}</p>
          <p><a href="${url}">Open in app</a></p>
        `,
      };

    case "requisition_status_changed":
      return {
        subject: `Requisition Status Update: ${resourceNumber}`,
        html: `
          <h2>Status Update: ${payload.metadata?.title || "Requisition"}</h2>
          <p>The status has been changed to <strong>${
            payload.metadata?.newStatus || "Updated"
          }</strong> by ${actorName}.</p>
          <p>${payload.metadata?.message || ""}</p>
          <p><a href="${url}">View details</a></p>
        `,
      };

    case "bid_selected":
      return {
        subject: `Bid Selected: ${resourceNumber}`,
        html: `
          <h2>Your bid has been selected!</h2>
          <p>Your bid for requisition <strong>${resourceNumber}</strong> has been selected.</p>
          <p>${payload.metadata?.message || ""}</p>
          <p><a href="${url}">View details</a></p>
        `,
      };

    case "vendor_shortlisted":
      return {
        subject: `Vendor Shortlisted: ${resourceNumber}`,
        html: `
          <h2>Vendor Shortlisted for Negotiation</h2>
          <p>The vendor has been shortlisted for requisition <strong>${resourceNumber}</strong> and invited for negotiation.</p>
          <p>${payload.metadata?.message || ""}</p>
          <p><a href="${url}">View details</a></p>
        `,
      };

    case "meeting_scheduled":
      return {
        subject: `Meeting Scheduled: ${resourceNumber}`,
        html: `
          <h2>New Meeting Scheduled</h2>
          <p>A meeting has been scheduled for requisition <strong>${resourceNumber}</strong>.</p>
          <p>Time: ${payload.metadata?.scheduledDate || "See details"}</p>
          <p>Meeting Link: <a href="${payload.metadata?.meetingLink}">${
          payload.metadata?.meetingLink || "See details"
        }</a></p>
          <p><a href="${url}">View details</a></p>
        `,
      };

    case "delivery_reminder":
      return {
        subject: `Delivery Reminder: ${resourceNumber}`,
        html: `
          <h2>Upcoming Delivery Reminder</h2>
          <p>This is a reminder that the delivery for requisition <strong>${resourceNumber}</strong> is scheduled for tomorrow.</p>
          <p>${payload.metadata?.message || ""}</p>
          <p><a href="${url}">View details</a></p>
        `,
      };

    case "delivery_late":
      return {
        subject: `Late Delivery Alert: ${resourceNumber}`,
        html: `
          <h2>Delivery is Late</h2>
          <p>The delivery for requisition <strong>${resourceNumber}</strong> is now overdue.</p>
          <p>Expected delivery date was: ${
            payload.metadata?.expectedDate || "See details"
          }</p>
          <p><a href="${url}">View details</a></p>
        `,
      };

    case "delivery_confirmed":
      return {
        subject: `Delivery Confirmed: ${resourceNumber}`,
        html: `
          <h2>Delivery Confirmed</h2>
          <p>The delivery for requisition <strong>${resourceNumber}</strong> has been confirmed by ${actorName}.</p>
          <p>${payload.metadata?.message || ""}</p>
          <p><a href="${url}">View details</a></p>
        `,
      };

    case "payment_status_updated":
      return {
        subject: `Payment Status Updated: ${resourceNumber}`,
        html: `
          <h2>Payment Status Updated</h2>
          <p>The payment status for requisition <strong>${resourceNumber}</strong> has been updated to <strong>${
          payload.metadata?.paymentStatus || "Updated"
        }</strong>.</p>
          <p>${payload.metadata?.message || ""}</p>
          <p><a href="${url}">View details</a></p>
        `,
      };

    case "bid_deadline_extended":
      return {
        subject: `Bid Deadline Extended: ${resourceNumber}`,
        html: `
          <h2>Bid Deadline Extended</h2>
          <p>The deadline for submitting bids for requisition <strong>${resourceNumber}</strong> has been extended.</p>
          <p><strong>New Deadline:</strong> ${new Date(
            payload.metadata?.newDeadline
          ).toLocaleString()}</p>
          <p><strong>Previous Deadline:</strong> ${new Date(
            payload.metadata?.oldDeadline
          ).toLocaleString()}</p>
          <p><strong>Reason:</strong> ${payload.metadata?.reason}</p>
          <p><a href="${url}">View details</a></p>
        `,
      };

    default:
      return {
        subject: `Notification: ${resourceNumber}`,
        html: `
          <h2>Notification</h2>
          <p>${previewShort || "You have a new notification."}</p>
          <p><a href="${url}">View details</a></p>
        `,
      };
  }
}

export async function notifyUsers(payload: NotificationPayload): Promise<void> {
  try {
    // emit internal event for potential web-socket bridge
    notifications.emit("notification", payload);

    const hasUsers = payload.targetUserIds?.length || 0;
    const hasVendors = payload.targetVendorIds?.length || 0;

    if (!hasUsers && !hasVendors) return;

    const actorModel = payload.actorModel || "User";
    const notificationDocs: any[] = [];

    // 1. Save user notifications to the database
    if (payload.targetUserIds?.length) {
      const userNotifications = payload.targetUserIds.map((userId) => ({
        type: payload.type,
        actor: toObjectId(payload.actorId),
        actorModel: actorModel,
        recipient: toObjectId(userId),
        recipientModel: "User",
        resource: {
          kind: payload.resource.kind,
          id: toObjectId(payload.resource.id),
          commentId: payload.resource.commentId,
        },
        metadata: payload.metadata,
      }));
      notificationDocs.push(...userNotifications);
    }

    // 2. Save vendor notifications to the database
    if (payload.targetVendorIds?.length) {
      const vendorNotifications = payload.targetVendorIds.map((vendorId) => ({
        type: payload.type,
        actor: toObjectId(payload.actorId),
        actorModel: actorModel,
        recipient: toObjectId(vendorId),
        recipientModel: "Vendor",
        resource: {
          kind: payload.resource.kind,
          id: toObjectId(payload.resource.id),
          commentId: payload.resource.commentId,
        },
        metadata: payload.metadata,
      }));
      notificationDocs.push(...vendorNotifications);
    }

    if (notificationDocs.length > 0) {
      await Notification.insertMany(notificationDocs);
    }

    // 3. Send email notifications
    const emailEnabled =
      (process.env.NOTIFY_EMAIL_ENABLED || "true").toLowerCase() === "true";
    if (!emailEnabled) return;

    // Get actor information (could be User or Vendor)
    let actor: any;
    if (actorModel === "Vendor") {
      const Vendor = mongoose.model("Vendor");
      actor = await Vendor.findById(payload.actorId)
        .select("name contactPerson email")
        .lean();
      // Normalize vendor structure to match user structure for email building
      if (actor) {
        actor.firstName = actor.name;
        actor.lastName = "";
      }
    } else {
      actor = await User.findById(payload.actorId)
        .select("firstName lastName email")
        .lean();
    }

    const emailRecipients: string[] = [];

    // Get user emails
    if (payload.targetUserIds?.length) {
      const users = await User.find({ _id: { $in: payload.targetUserIds } })
        .select("firstName lastName email")
        .lean();
      emailRecipients.push(
        ...users.filter((u) => !!u.email).map((u) => u.email as string)
      );
    }

    // Get vendor emails
    if (payload.targetVendorIds?.length) {
      const Vendor = mongoose.model("Vendor");
      const vendors = await Vendor.find({
        _id: { $in: payload.targetVendorIds },
      })
        .select("name email")
        .lean();
      emailRecipients.push(
        ...vendors
          .filter((v: any) => !!v.email)
          .map((v: any) => v.email as string)
      );
    }

    if (!emailRecipients.length) return;

    const { subject, html } = buildEmail(payload, actor);
    await emailService.sendEmail({
      to: emailRecipients,
      subject,
      html,
    });
  } catch (err) {
    // Do not throw – keep API response flow unaffected
    // eslint-disable-next-line no-console
    console.error("[notifyUsers] failed", err);
  }
}

/**
 * Convenience function to notify only vendors
 * @param payload - Notification payload with vendor IDs
 */
export async function notifyVendors(
  payload: Omit<NotificationPayload, "targetUserIds"> & {
    targetVendorIds: string[];
  }
): Promise<void> {
  return notifyUsers({
    ...payload,
    actorModel: payload.actorModel || "User",
  });
}

/**
 * Convenience function to notify both users and vendors
 * @param payload - Notification payload with both user and vendor IDs
 */
export async function notifyAll(
  payload: NotificationPayload & {
    targetUserIds?: string[];
    targetVendorIds?: string[];
  }
): Promise<void> {
  return notifyUsers(payload);
}

/**
 * Send delivery reminder notifications
 * @param deliveryId - ID of the delivery to send reminders for
 */
export async function sendDeliveryReminders(deliveryId: string): Promise<void> {
  try {
    const Delivery = mongoose.model("Delivery");
    const PurchaseOrder = mongoose.model("PurchaseOrder");
    const Requisition = mongoose.model("Requisition");
    const User = mongoose.model("User");
    const Vendor = mongoose.model("Vendor");

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      console.error(
        `[sendDeliveryReminders] Delivery not found: ${deliveryId}`
      );
      return;
    }

    const purchaseOrder = await PurchaseOrder.findById(delivery.purchaseOrder);
    if (!purchaseOrder) {
      console.error(
        `[sendDeliveryReminders] PO not found for delivery: ${deliveryId}`
      );
      return;
    }

    const requisition = await Requisition.findById(purchaseOrder.requisition)
      .populate("requester")
      .populate("department");

    if (!requisition) {
      console.error(
        `[sendDeliveryReminders] Requisition not found for delivery: ${deliveryId}`
      );
      return;
    }

    // Get vendor
    const vendor = await Vendor.findById(purchaseOrder.vendor);

    // Find department head
    const departmentHead = await User.findOne({
      department: requisition.department,
      role: "departmentHead",
    });

    // Find procurement manager
    const procurementManager = await User.findOne({
      role: "procurementManager",
    });

    // Target users for notification
    const targetUserIds: string[] = [];

    // Add vendor user
    const vendorUser = await User.findOne({ vendor: vendor?._id });
    if (vendorUser) {
      targetUserIds.push(vendorUser._id.toString());
    }

    // Add requester
    if (requisition.requester) {
      targetUserIds.push(requisition.requester._id.toString());
    }

    // Add department head
    if (departmentHead) {
      targetUserIds.push(departmentHead._id.toString());
    }

    // Add procurement manager
    if (procurementManager) {
      targetUserIds.push(procurementManager._id.toString());
    }

    // Send notification
    await notifyUsers({
      type: "delivery_reminder",
      actorId: procurementManager?._id.toString() || "system",
      targetUserIds,
      resource: {
        kind: "delivery",
        id: delivery._id.toString(),
      },
      metadata: {
        resourceNumber: requisition.requisitionNumber,
        expectedDate: delivery.expectedDeliveryDate.toLocaleDateString(),
        title: requisition.title,
        message: `Delivery for requisition ${requisition.requisitionNumber} is scheduled for tomorrow. Please ensure you are prepared for this delivery.`,
      },
    });
  } catch (err) {
    console.error("[sendDeliveryReminders] failed", err);
  }
}

/**
 * Send late delivery notifications
 * @param deliveryId - ID of the delivery that is late
 */
export async function sendLateDeliveryAlerts(
  deliveryId: string
): Promise<void> {
  try {
    const Delivery = mongoose.model("Delivery");
    const PurchaseOrder = mongoose.model("PurchaseOrder");
    const Requisition = mongoose.model("Requisition");
    const User = mongoose.model("User");

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      console.error(
        `[sendLateDeliveryAlerts] Delivery not found: ${deliveryId}`
      );
      return;
    }

    const purchaseOrder = await PurchaseOrder.findById(delivery.purchaseOrder);
    if (!purchaseOrder) {
      console.error(
        `[sendLateDeliveryAlerts] PO not found for delivery: ${deliveryId}`
      );
      return;
    }

    const requisition = await Requisition.findById(purchaseOrder.requisition)
      .populate("requester")
      .populate("department");

    if (!requisition) {
      console.error(
        `[sendLateDeliveryAlerts] Requisition not found for delivery: ${deliveryId}`
      );
      return;
    }

    // Find department head
    const departmentHead = await User.findOne({
      department: requisition.department,
      role: "departmentHead",
    });

    // Find procurement manager
    const procurementManager = await User.findOne({
      role: "procurementManager",
    });

    // Target users for notification
    const targetUserIds: string[] = [];

    // Add requester
    if (requisition.requester) {
      targetUserIds.push(requisition.requester._id.toString());
    }

    // Add department head
    if (departmentHead) {
      targetUserIds.push(departmentHead._id.toString());
    }

    // Add procurement manager
    if (procurementManager) {
      targetUserIds.push(procurementManager._id.toString());
    }

    // Send notification
    await notifyUsers({
      type: "delivery_late",
      actorId: "system",
      targetUserIds,
      resource: {
        kind: "delivery",
        id: delivery._id.toString(),
      },
      metadata: {
        resourceNumber: requisition.requisitionNumber,
        expectedDate: delivery.expectedDeliveryDate.toLocaleDateString(),
        title: requisition.title,
        message: `Delivery for requisition ${
          requisition.requisitionNumber
        } is now overdue. The expected delivery date was ${delivery.expectedDeliveryDate.toLocaleDateString()}.`,
      },
    });
  } catch (err) {
    console.error("[sendLateDeliveryAlerts] failed", err);
  }
}

/**
 * Send payment status notifications (restricted to HHRA, PM, and HOD)
 * @param purchaseOrderId - ID of the purchase order with updated payment status
 * @param paymentStatus - The new payment status
 * @param actorId - ID of the user who updated the payment status
 */
export async function sendPaymentStatusNotification(
  purchaseOrderId: string,
  paymentStatus: string,
  actorId: string
): Promise<void> {
  try {
    const PurchaseOrder = mongoose.model("PurchaseOrder");
    const Requisition = mongoose.model("Requisition");
    const User = mongoose.model("User");

    const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
    if (!purchaseOrder) {
      console.error(
        `[sendPaymentStatusNotification] PO not found: ${purchaseOrderId}`
      );
      return;
    }

    const requisition = await Requisition.findById(purchaseOrder.requisition);
    if (!requisition) {
      console.error(
        `[sendPaymentStatusNotification] Requisition not found for PO: ${purchaseOrderId}`
      );
      return;
    }

    // Find department head
    const departmentHead = await User.findOne({
      department: requisition.department,
      role: "departmentHead",
    });

    // Find procurement manager
    const procurementManager = await User.findOne({
      role: "procurementManager",
    });

    // Find HR approver
    const hrApprover = await User.findOne({
      role: "hrApprover",
    });

    // Target users for notification - ONLY HHRA, PM, and HOD
    const targetUserIds: string[] = [];

    // Add department head
    if (departmentHead) {
      targetUserIds.push(departmentHead._id.toString());
    }

    // Add procurement manager
    if (procurementManager) {
      targetUserIds.push(procurementManager._id.toString());
    }

    // Add HR approver
    if (hrApprover) {
      targetUserIds.push(hrApprover._id.toString());
    }

    // Send notification
    await notifyUsers({
      type: "payment_status_updated",
      actorId: actorId,
      targetUserIds,
      resource: {
        kind: "purchaseOrder",
        id: purchaseOrder._id.toString(),
      },
      metadata: {
        resourceNumber: requisition.requisitionNumber,
        title: requisition.title,
        paymentStatus: paymentStatus,
        message: `Payment status for requisition ${requisition.requisitionNumber} has been updated to ${paymentStatus}.`,
      },
    });
  } catch (err) {
    console.error("[sendPaymentStatusNotification] failed", err);
  }
}
