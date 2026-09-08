import Notification from "../models/notification.model";
import User from "../models/user.model";
import Requisition from "../models/requisition.model";
import { UserRole } from "../types/enums";
import emailService from "./emailService";

/**
 * Notify when an item is approved by department head
 */
export const notifyItemDepartmentApproved = async (
  requisitionId: string,
  itemId: string,
  approvedBy: string
) => {
  try {
    const requisition = await Requisition.findById(requisitionId)
      .populate("requester", "firstName lastName email")
      .populate("department", "name");

    if (!requisition) return;

    const item = requisition.items.find(
      (i: any) => i._id?.toString() === itemId
    );
    if (!item) return;

    const approver = await User.findById(approvedBy);
    const requester = requisition.requester as any;

    // Notify requester
    await Notification.create({
      type: "requisition_status_changed",
      actor: approvedBy,
      actorModel: "User",
      recipient: requisition.requester,
      recipientModel: "User",
      resource: {
        kind: "requisition",
        id: requisitionId,
      },
      metadata: {
        itemId,
        itemName: item.itemName,
        action: "item_approved",
        message: `Item "${item.itemName}" in requisition ${requisition.requisitionNumber} has been approved by ${approver?.firstName} ${approver?.lastName}`,
      },
    });

    // Send email
    if (requester?.email) {
      await emailService.sendEmail({
        to: requester.email,
        subject: `Item Approved - ${requisition.requisitionNumber}`,
        html: `
          <h2>Item Approved</h2>
          <p>Dear ${requester.firstName},</p>
          <p>Your item "<strong>${item.itemName}</strong>" in requisition <strong>${requisition.requisitionNumber}</strong> has been approved by ${approver?.firstName} ${approver?.lastName}.</p>
          <p>Requisition Title: ${requisition.title}</p>
        `,
      });
    }

    // Notify HHRA for next approval
    const hhraUsers = await User.find({ role: UserRole.HHRA, isActive: true });
    for (const hhra of hhraUsers) {
      await Notification.create({
        type: "requisition_status_changed",
        actor: approvedBy,
        actorModel: "User",
        recipient: hhra._id,
        recipientModel: "User",
        resource: {
          kind: "requisition",
          id: requisitionId,
        },
        metadata: {
          itemId,
          itemName: item.itemName,
          action: "item_pending_approval",
          message: `Item "${item.itemName}" in requisition ${requisition.requisitionNumber} is pending your approval`,
        },
      });
    }
  } catch (error) {
    console.error("Error in notifyItemDepartmentApproved:", error);
  }
};

/**
 * Notify when an item is rejected by department head
 */
export const notifyItemDepartmentRejected = async (
  requisitionId: string,
  itemId: string,
  rejectedBy: string,
  comments?: string
) => {
  try {
    const requisition = await Requisition.findById(requisitionId).populate(
      "requester",
      "firstName lastName email"
    );

    if (!requisition) return;

    const item = requisition.items.find(
      (i: any) => i._id?.toString() === itemId
    );
    if (!item) return;

    const rejecter = await User.findById(rejectedBy);
    const requester = requisition.requester as any;

    // Notify requester
    await Notification.create({
      type: "requisition_status_changed",
      actor: rejectedBy,
      actorModel: "User",
      recipient: requisition.requester,
      recipientModel: "User",
      resource: {
        kind: "requisition",
        id: requisitionId,
      },
      metadata: {
        itemId,
        itemName: item.itemName,
        action: "item_rejected",
        comments,
        message: `Item "${item.itemName}" in requisition ${requisition.requisitionNumber} has been rejected by ${rejecter?.firstName} ${rejecter?.lastName}`,
      },
    });

    // Send email
    if (requester?.email) {
      await emailService.sendEmail({
        to: requester.email,
        subject: `Item Rejected - ${requisition.requisitionNumber}`,
        html: `
          <h2>Item Rejected</h2>
          <p>Dear ${requester.firstName},</p>
          <p>Your item "<strong>${
            item.itemName
          }</strong>" in requisition <strong>${
          requisition.requisitionNumber
        }</strong> has been rejected by ${rejecter?.firstName} ${
          rejecter?.lastName
        }.</p>
          ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ""}
          <p>Requisition Title: ${requisition.title}</p>
        `,
      });
    }
  } catch (error) {
    console.error("Error in notifyItemDepartmentRejected:", error);
  }
};

/**
 * Notify when an item is approved by HHRA
 */
export const notifyItemHhraApproved = async (
  requisitionId: string,
  itemId: string,
  approvedBy: string
) => {
  try {
    const requisition = await Requisition.findById(requisitionId)
      .populate("requester", "firstName lastName email")
      .populate("department", "name head");

    if (!requisition) return;

    const item = requisition.items.find(
      (i: any) => i._id?.toString() === itemId
    );
    if (!item) return;

    const requester = requisition.requester as any;

    // Notify requester
    await Notification.create({
      type: "requisition_status_changed",
      actor: approvedBy,
      actorModel: "User",
      recipient: requisition.requester,
      recipientModel: "User",
      resource: {
        kind: "requisition",
        id: requisitionId,
      },
      metadata: {
        itemId,
        itemName: item.itemName,
        action: "item_hhra_approved",
        message: `Item "${item.itemName}" in requisition ${requisition.requisitionNumber} has been approved by HHRA`,
      },
    });

    // Send email
    if (requester?.email) {
      await emailService.sendEmail({
        to: requester.email,
        subject: `Item HHRA Approved - ${requisition.requisitionNumber}`,
        html: `
          <h2>Item HHRA Approved</h2>
          <p>Dear ${requester.firstName},</p>
          <p>Your item "<strong>${item.itemName}</strong>" in requisition <strong>${requisition.requisitionNumber}</strong> has been approved by HHRA.</p>
          <p>The item is now ready for procurement processing.</p>
        `,
      });
    }

    // Notify procurement manager
    const procurementManagers = await User.find({
      role: UserRole.PROCUREMENT_MANAGER,
      isActive: true,
    });
    for (const pm of procurementManagers) {
      await Notification.create({
        type: "requisition_status_changed",
        actor: approvedBy,
        actorModel: "User",
        recipient: pm._id,
        recipientModel: "User",
        resource: {
          kind: "requisition",
          id: requisitionId,
        },
        metadata: {
          itemId,
          itemName: item.itemName,
          action: "item_ready_for_procurement",
          message: `Item "${item.itemName}" in requisition ${requisition.requisitionNumber} is ready for procurement`,
        },
      });
    }
  } catch (error) {
    console.error("Error in notifyItemHhraApproved:", error);
  }
};

/**
 * Notify when an item is rejected by HHRA
 */
export const notifyItemHhraRejected = async (
  requisitionId: string,
  itemId: string,
  rejectedBy: string,
  comments?: string
) => {
  try {
    const requisition = await Requisition.findById(requisitionId).populate(
      "requester",
      "firstName lastName email"
    );

    if (!requisition) return;

    const item = requisition.items.find(
      (i: any) => i._id?.toString() === itemId
    );
    if (!item) return;

    const requester = requisition.requester as any;

    // Notify requester
    await Notification.create({
      type: "requisition_status_changed",
      actor: rejectedBy,
      actorModel: "User",
      recipient: requisition.requester,
      recipientModel: "User",
      resource: {
        kind: "requisition",
        id: requisitionId,
      },
      metadata: {
        itemId,
        itemName: item.itemName,
        action: "item_hhra_rejected",
        comments,
        message: `Item "${item.itemName}" in requisition ${requisition.requisitionNumber} has been rejected by HHRA`,
      },
    });

    // Send email
    if (requester?.email) {
      await emailService.sendEmail({
        to: requester.email,
        subject: `Item HHRA Rejected - ${requisition.requisitionNumber}`,
        html: `
          <h2>Item HHRA Rejected</h2>
          <p>Dear ${requester.firstName},</p>
          <p>Your item "<strong>${
            item.itemName
          }</strong>" in requisition <strong>${
          requisition.requisitionNumber
        }</strong> has been rejected by HHRA.</p>
          ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ""}
        `,
      });
    }

    // Notify department head
    const dept = requisition.department as any;
    if (dept?.head) {
      await Notification.create({
        type: "requisition_status_changed",
        actor: rejectedBy,
        actorModel: "User",
        recipient: dept.head,
        recipientModel: "User",
        resource: {
          kind: "requisition",
          id: requisitionId,
        },
        metadata: {
          itemId,
          itemName: item.itemName,
          action: "item_hhra_rejected",
          comments,
          message: `Item "${item.itemName}" in requisition ${requisition.requisitionNumber} was rejected by HHRA`,
        },
      });
    }
  } catch (error) {
    console.error("Error in notifyItemHhraRejected:", error);
  }
};

/**
 * Notify when items are bulk approved/rejected
 */
export const notifyBulkItemAction = async (
  requisitionId: string,
  itemIds: string[],
  action: "approved" | "rejected",
  performedBy: string,
  role: "department" | "hhra"
) => {
  try {
    const requisition = await Requisition.findById(requisitionId).populate(
      "requester",
      "firstName lastName email"
    );

    if (!requisition) return;

    const performer = await User.findById(performedBy);
    const requester = requisition.requester as any;

    const items = requisition.items.filter((i: any) =>
      itemIds.includes(i._id?.toString())
    );

    const itemNames = items.map((i) => i.itemName).join(", ");

    // Notify requester
    await Notification.create({
      type: "requisition_status_changed",
      actor: performedBy,
      actorModel: "User",
      recipient: requisition.requester,
      recipientModel: "User",
      resource: {
        kind: "requisition",
        id: requisitionId,
      },
      metadata: {
        itemIds,
        itemCount: items.length,
        action,
        role,
        message: `${items.length} items in requisition ${
          requisition.requisitionNumber
        } have been ${action} by ${role.toUpperCase()}`,
      },
    });

    // Send email
    if (requester?.email) {
      await emailService.sendEmail({
        to: requester.email,
        subject: `Bulk ${action === "approved" ? "Approval" : "Rejection"} - ${
          requisition.requisitionNumber
        }`,
        html: `
          <h2>Bulk Item ${action === "approved" ? "Approval" : "Rejection"}</h2>
          <p>Dear ${requester.firstName},</p>
          <p><strong>${
            items.length
          }</strong> items in your requisition <strong>${
          requisition.requisitionNumber
        }</strong> have been ${action} by ${performer?.firstName} ${
          performer?.lastName
        } (${role.toUpperCase()}).</p>
          <p><strong>Items:</strong> ${itemNames}</p>
        `,
      });
    }
  } catch (error) {
    console.error("Error in notifyBulkItemAction:", error);
  }
};
