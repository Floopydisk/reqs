import { NotificationPayload, NotificationType } from "../utils/notification";
import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  type: NotificationType;
  actor: mongoose.Types.ObjectId;
  actorModel: "User" | "Vendor";
  recipient: mongoose.Types.ObjectId;
  recipientModel: "User" | "Vendor";
  resource: {
    kind: "requisition" | "bid" | "delivery" | "negotiation" | "purchaseOrder";
    id: mongoose.Types.ObjectId;
    commentId?: string;
  };
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "comment_created",
        "comment_replied",
        "comment_tagged",
        "requisition_status_changed",
        "bid_selected",
        "vendor_shortlisted",
        "meeting_scheduled",
        "delivery_reminder",
        "delivery_late",
        "delivery_confirmed",
        "payment_status_updated",
        "bid_deadline_extended",
      ],
    },
    actor: {
      type: Schema.Types.ObjectId,
      refPath: "actorModel",
      required: true,
    },
    actorModel: {
      type: String,
      required: true,
      enum: ["User", "Vendor"],
      default: "User",
    },
    recipient: {
      type: Schema.Types.ObjectId,
      refPath: "recipientModel",
      required: true,
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ["User", "Vendor"],
      default: "User",
    },
    resource: {
      kind: {
        type: String,
        required: true,
        enum: [
          "requisition",
          "bid",
          "delivery",
          "negotiation",
          "purchaseOrder",
        ],
      },
      id: {
        type: Schema.Types.ObjectId,
        required: true,
        // Dynamic reference based on the 'kind' field
        refPath: "resource.kind",
      },
      commentId: {
        type: String,
      },
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexing for faster queries
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);

export default Notification;
