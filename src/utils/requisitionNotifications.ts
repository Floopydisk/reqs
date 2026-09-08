import { notifyUsers } from "./notification";
import User from "../models/user.model";
import Vendor from "../models/vendor.model";
import { UserRole } from "../types/enums";
import mongoose from "mongoose";

/**
 * Helper to get relevant stakeholders for a requisition
 */
export async function getRequisitionStakeholders(requisition: any) {
  const stakeholders: {
    requester?: string;
    departmentHead?: string;
    procurementManagers: string[];
    hhras: string[];
    selectedVendors: string[];
  } = {
    procurementManagers: [],
    hhras: [],
    selectedVendors: [],
  };

  // Get requester
  if (requisition.requester) {
    stakeholders.requester =
      typeof requisition.requester === "object"
        ? requisition.requester._id.toString()
        : requisition.requester.toString();
  }

  // Get department head
  if (requisition.department) {
    const Department = mongoose.model("Department");
    const dept = await Department.findById(requisition.department);
    if (dept && dept.head) {
      stakeholders.departmentHead =
        typeof dept.head === "object"
          ? (dept.head as any)._id.toString()
          : dept.head.toString();
    }
  }

  // Get all procurement managers
  const pms = await User.find({ role: UserRole.PROCUREMENT_MANAGER }).select(
    "_id"
  );
  stakeholders.procurementManagers = pms
    .map((pm) => pm._id?.toString() || "")
    .filter((id) => id !== "");

  // Get all HHRAs
  const hhras = await User.find({ role: UserRole.HHRA }).select("_id");
  stakeholders.hhras = hhras
    .map((hhra) => hhra._id?.toString() || "")
    .filter((id) => id !== "");

  // Get selected vendors if any
  if (requisition.selectedVendors && requisition.selectedVendors.length > 0) {
    stakeholders.selectedVendors = requisition.selectedVendors.map((v: any) =>
      typeof v === "object" ? v._id.toString() : v.toString()
    );
  }

  return stakeholders;
}

/**
 * Notify when requisition is created
 */
export async function notifyRequisitionCreated(
  requisition: any,
  actorId: string
) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);

    // If created by staff, notify department head
    if (stakeholders.departmentHead) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId,
        targetUserIds: [stakeholders.departmentHead],
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: "A new requisition has been created in your department.",
        },
      });
    }
  } catch (error) {
    console.error("[notifyRequisitionCreated] failed", error);
  }
}

/**
 * Notify when requisition is submitted
 */
export async function notifyRequisitionSubmitted(
  requisition: any,
  actorId: string
) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);
    const targetUserIds: string[] = [];

    // Notify department head
    if (stakeholders.departmentHead) {
      targetUserIds.push(stakeholders.departmentHead);
    }

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId,
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: "A requisition has been submitted for your approval.",
        },
      });
    }
  } catch (error) {
    console.error("[notifyRequisitionSubmitted] failed", error);
  }
}

/**
 * Notify when requisition is approved by department
 */
export async function notifyDepartmentApproval(
  requisition: any,
  actorId: string,
  comments?: string
) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);
    const targetUserIds: string[] = [];

    // Notify requester
    if (stakeholders.requester) {
      targetUserIds.push(stakeholders.requester);
    }

    // Notify procurement managers
    targetUserIds.push(...stakeholders.procurementManagers);

    // Notify HHRAs
    targetUserIds.push(...stakeholders.hhras);

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId,
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: comments
            ? `Requisition approved by department. Comment: ${comments}`
            : "Requisition approved by department.",
        },
      });
    }
  } catch (error) {
    console.error("[notifyDepartmentApproval] failed", error);
  }
}

/**
 * Notify when requisition is rejected by department
 */
export async function notifyDepartmentRejection(
  requisition: any,
  actorId: string,
  comments: string
) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);

    // Notify requester only
    if (stakeholders.requester) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId,
        targetUserIds: [stakeholders.requester],
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: `Requisition rejected by department. Reason: ${comments}`,
        },
      });
    }
  } catch (error) {
    console.error("[notifyDepartmentRejection] failed", error);
  }
}

/**
 * Notify when requisition is updated
 */
export async function notifyRequisitionUpdated(
  requisition: any,
  actorId: string
) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);
    const targetUserIds: string[] = [];

    // Notify department head if in draft or submitted
    if (
      stakeholders.departmentHead &&
      ["draft", "submitted"].includes(requisition.status)
    ) {
      targetUserIds.push(stakeholders.departmentHead);
    }

    // Notify PMs and HHRAs if beyond department approval
    if (
      ["departmentApproved", "procurementReview", "vendorBidding"].includes(
        requisition.status
      )
    ) {
      targetUserIds.push(...stakeholders.procurementManagers);
      targetUserIds.push(...stakeholders.hhras);
    }

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId,
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: "A requisition has been updated.",
        },
      });
    }
  } catch (error) {
    console.error("[notifyRequisitionUpdated] failed", error);
  }
}

/**
 * Notify when requisition is deleted
 */
export async function notifyRequisitionDeleted(
  requisition: any,
  actorId: string
) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);
    const targetUserIds: string[] = [];

    // Notify department head
    if (stakeholders.departmentHead) {
      targetUserIds.push(stakeholders.departmentHead);
    }

    // Notify PMs and HHRAs if beyond draft
    if (requisition.status !== "draft") {
      targetUserIds.push(...stakeholders.procurementManagers);
      targetUserIds.push(...stakeholders.hhras);
    }

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId,
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: "cancelled",
          message: "A requisition has been deleted/cancelled.",
        },
      });
    }
  } catch (error) {
    console.error("[notifyRequisitionDeleted] failed", error);
  }
}

/**
 * Notify when bidding is initiated
 */
export async function notifyBiddingInitiated(
  requisition: any,
  actorId: string,
  selectedVendorIds: string[]
) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);

    // Notify requester, department head, and HHRAs
    const targetUserIds: string[] = [];
    if (stakeholders.requester) {
      targetUserIds.push(stakeholders.requester);
    }
    if (stakeholders.departmentHead) {
      targetUserIds.push(stakeholders.departmentHead);
    }
    targetUserIds.push(...stakeholders.hhras);

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId,
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: `Bidding has been initiated for this requisition. ${selectedVendorIds.length} vendor(s) invited.`,
        },
      });
    }

    // Notify vendors
    if (selectedVendorIds.length > 0) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId,
        actorModel: "User",
        targetVendorIds: selectedVendorIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: "You have been invited to bid on this requisition.",
        },
      });
    }
  } catch (error) {
    console.error("[notifyBiddingInitiated] failed", error);
  }
}

/**
 * Notify when bid is submitted by vendor
 */
export async function notifyBidSubmitted(
  requisition: any,
  bidId: string,
  vendorId: string
) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);
    const targetUserIds: string[] = [];

    // Notify requester
    if (stakeholders.requester) {
      targetUserIds.push(stakeholders.requester);
    }

    // Notify department head
    if (stakeholders.departmentHead) {
      targetUserIds.push(stakeholders.departmentHead);
    }

    // Notify procurement managers
    targetUserIds.push(...stakeholders.procurementManagers);

    // Notify HHRAs
    targetUserIds.push(...stakeholders.hhras);

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId: vendorId,
        actorModel: "Vendor",
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: "A vendor has submitted a bid for this requisition.",
        },
      });
    }
  } catch (error) {
    console.error("[notifyBidSubmitted] failed", error);
  }
}

/**
 * Notify when bid is selected
 */
export async function notifyBidSelected(
  requisition: any,
  bidId: string,
  vendorId: string,
  actorId: string
) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);
    const targetUserIds: string[] = [];

    // Notify requester
    if (stakeholders.requester) {
      targetUserIds.push(stakeholders.requester);
    }

    // Notify department head
    if (stakeholders.departmentHead) {
      targetUserIds.push(stakeholders.departmentHead);
    }

    // Notify HHRAs
    targetUserIds.push(...stakeholders.hhras);

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "bid_selected",
        actorId,
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          message: "A bid has been selected for this requisition.",
        },
      });
    }

    // Notify the winning vendor
    await notifyUsers({
      type: "bid_selected",
      actorId,
      actorModel: "User",
      targetVendorIds: [vendorId],
      resource: {
        kind: "requisition",
        id: requisition._id.toString(),
      },
      metadata: {
        resourceNumber: requisition.requisitionNumber,
        title: requisition.title,
        message: "Congratulations! Your bid has been selected.",
      },
    });

    // Notify other vendors who bid but were not selected
    if (stakeholders.selectedVendors.length > 0) {
      const otherVendors = stakeholders.selectedVendors.filter(
        (v) => v !== vendorId
      );
      if (otherVendors.length > 0) {
        await notifyUsers({
          type: "requisition_status_changed",
          actorId,
          actorModel: "User",
          targetVendorIds: otherVendors,
          resource: {
            kind: "requisition",
            id: requisition._id.toString(),
          },
          metadata: {
            resourceNumber: requisition.requisitionNumber,
            title: requisition.title,
            message:
              "Thank you for your bid. Another vendor has been selected for this requisition.",
          },
        });
      }
    }
  } catch (error) {
    console.error("[notifyBidSelected] failed", error);
  }
}

/**
 * Notify when HHRA approves/rejects requisition
 */
export async function notifyHHRADecision(
  requisition: any,
  actorId: string,
  approved: boolean,
  comments?: string
) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);
    const targetUserIds: string[] = [];

    // Notify requester
    if (stakeholders.requester) {
      targetUserIds.push(stakeholders.requester);
    }

    // Notify department head
    if (stakeholders.departmentHead) {
      targetUserIds.push(stakeholders.departmentHead);
    }

    // Notify procurement managers
    targetUserIds.push(...stakeholders.procurementManagers);

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId,
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: approved
            ? `Requisition approved by HHRA.${
                comments ? ` Comment: ${comments}` : ""
              }`
            : `Requisition rejected by HHRA. Reason: ${
                comments || "No reason provided"
              }`,
        },
      });
    }

    // Notify selected vendor if approved
    if (approved && stakeholders.selectedVendors.length > 0) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId,
        actorModel: "User",
        targetVendorIds: stakeholders.selectedVendors,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message:
            "Requisition has been approved by HHRA. Proceeding to next stage.",
        },
      });
    }
  } catch (error) {
    console.error("[notifyHHRADecision] failed", error);
  }
}

/**
 * Notify when PO is generated
 */
export async function notifyPOGenerated(
  requisition: any,
  poNumber: string,
  actorId: string
) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);
    const targetUserIds: string[] = [];

    // Notify requester
    if (stakeholders.requester) {
      targetUserIds.push(stakeholders.requester);
    }

    // Notify department head
    if (stakeholders.departmentHead) {
      targetUserIds.push(stakeholders.departmentHead);
    }

    // Notify HHRAs
    targetUserIds.push(...stakeholders.hhras);

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId,
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: `Purchase Order ${poNumber} has been generated for this requisition.`,
        },
      });
    }

    // Notify selected vendor
    if (stakeholders.selectedVendors.length > 0) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId,
        actorModel: "User",
        targetVendorIds: stakeholders.selectedVendors,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: `Purchase Order ${poNumber} has been generated. Please acknowledge to proceed.`,
        },
      });
    }
  } catch (error) {
    console.error("[notifyPOGenerated] failed", error);
  }
}

/**
 * Notify when vendor acknowledges PO
 */
export async function notifyPOAcknowledged(requisition: any, vendorId: string) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);
    const targetUserIds: string[] = [];

    // Notify requester
    if (stakeholders.requester) {
      targetUserIds.push(stakeholders.requester);
    }

    // Notify department head
    if (stakeholders.departmentHead) {
      targetUserIds.push(stakeholders.departmentHead);
    }

    // Notify procurement managers
    targetUserIds.push(...stakeholders.procurementManagers);

    // Notify HHRAs
    targetUserIds.push(...stakeholders.hhras);

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId: vendorId,
        actorModel: "Vendor",
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: "Vendor has acknowledged the Purchase Order.",
        },
      });
    }
  } catch (error) {
    console.error("[notifyPOAcknowledged] failed", error);
  }
}

/**
 * Notify when delivery is marked
 */
export async function notifyDeliveryMade(requisition: any, vendorId: string) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);
    const targetUserIds: string[] = [];

    // Notify requester
    if (stakeholders.requester) {
      targetUserIds.push(stakeholders.requester);
    }

    // Notify department head
    if (stakeholders.departmentHead) {
      targetUserIds.push(stakeholders.departmentHead);
    }

    // Notify procurement managers
    targetUserIds.push(...stakeholders.procurementManagers);

    // Notify HHRAs
    targetUserIds.push(...stakeholders.hhras);

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "delivery_confirmed",
        actorId: vendorId,
        actorModel: "Vendor",
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message:
            "Vendor has marked the delivery as complete. Please confirm receipt.",
        },
      });
    }
  } catch (error) {
    console.error("[notifyDeliveryMade] failed", error);
  }
}

/**
 * Notify when inventory confirms delivery
 */
export async function notifyInventoryConfirmed(
  requisition: any,
  actorId: string
) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);
    const targetUserIds: string[] = [];

    // Notify requester
    if (stakeholders.requester) {
      targetUserIds.push(stakeholders.requester);
    }

    // Notify department head
    if (stakeholders.departmentHead) {
      targetUserIds.push(stakeholders.departmentHead);
    }

    // Notify HHRAs
    targetUserIds.push(...stakeholders.hhras);

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "delivery_confirmed",
        actorId,
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message:
            "Inventory has confirmed the delivery. Awaiting department confirmation.",
        },
      });
    }

    // Notify vendor
    if (stakeholders.selectedVendors.length > 0) {
      await notifyUsers({
        type: "delivery_confirmed",
        actorId,
        actorModel: "User",
        targetVendorIds: stakeholders.selectedVendors,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: "Inventory has confirmed the delivery.",
        },
      });
    }
  } catch (error) {
    console.error("[notifyInventoryConfirmed] failed", error);
  }
}

/**
 * Notify when department confirms delivery
 */
export async function notifyDepartmentConfirmed(
  requisition: any,
  actorId: string
) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);
    const targetUserIds: string[] = [];

    // Notify requester (if different from actor)
    if (stakeholders.requester && stakeholders.requester !== actorId) {
      targetUserIds.push(stakeholders.requester);
    }

    // Notify procurement managers
    targetUserIds.push(...stakeholders.procurementManagers);

    // Notify HHRAs
    targetUserIds.push(...stakeholders.hhras);

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "delivery_confirmed",
        actorId,
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message:
            "Department has confirmed receipt of delivery. Requisition is now complete.",
        },
      });
    }

    // Notify vendor
    if (stakeholders.selectedVendors.length > 0) {
      await notifyUsers({
        type: "delivery_confirmed",
        actorId,
        actorModel: "User",
        targetVendorIds: stakeholders.selectedVendors,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message:
            "Department has confirmed receipt. Transaction completed successfully.",
        },
      });
    }
  } catch (error) {
    console.error("[notifyDepartmentConfirmed] failed", error);
  }
}

/**
 * Notify when requisition is completed
 */
export async function notifyRequisitionCompleted(
  requisition: any,
  actorId: string
) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);
    const targetUserIds: string[] = [];

    // Notify requester
    if (stakeholders.requester) {
      targetUserIds.push(stakeholders.requester);
    }

    // Notify department head
    if (stakeholders.departmentHead) {
      targetUserIds.push(stakeholders.departmentHead);
    }

    // Notify HHRAs
    targetUserIds.push(...stakeholders.hhras);

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId,
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: "Requisition has been completed successfully.",
        },
      });
    }

    // Notify vendor
    if (stakeholders.selectedVendors.length > 0) {
      await notifyUsers({
        type: "requisition_status_changed",
        actorId,
        actorModel: "User",
        targetVendorIds: stakeholders.selectedVendors,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          newStatus: requisition.status,
          message: "Requisition completed. Thank you for your service.",
        },
      });
    }
  } catch (error) {
    console.error("[notifyRequisitionCompleted] failed", error);
  }
}

/**
 * Notify when payment is made
 */
export async function notifyPaymentMade(requisition: any, actorId: string) {
  try {
    const stakeholders = await getRequisitionStakeholders(requisition);
    const targetUserIds: string[] = [];

    // Notify requester
    if (stakeholders.requester) {
      targetUserIds.push(stakeholders.requester);
    }

    // Notify department head
    if (stakeholders.departmentHead) {
      targetUserIds.push(stakeholders.departmentHead);
    }

    // Notify procurement managers
    targetUserIds.push(...stakeholders.procurementManagers);

    if (targetUserIds.length > 0) {
      await notifyUsers({
        type: "payment_status_updated",
        actorId,
        targetUserIds,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          paymentStatus: "Paid",
          message: "Payment has been processed for this requisition.",
        },
      });
    }

    // Notify vendor
    if (stakeholders.selectedVendors.length > 0) {
      await notifyUsers({
        type: "payment_status_updated",
        actorId,
        actorModel: "User",
        targetVendorIds: stakeholders.selectedVendors,
        resource: {
          kind: "requisition",
          id: requisition._id.toString(),
        },
        metadata: {
          resourceNumber: requisition.requisitionNumber,
          title: requisition.title,
          paymentStatus: "Paid",
          message: "Payment has been processed for your service.",
        },
      });
    }
  } catch (error) {
    console.error("[notifyPaymentMade] failed", error);
  }
}
