import mongoose, { Document, Schema } from "mongoose";

export interface CommentDocument extends Document {
  text: string;
  author: mongoose.Types.ObjectId;
  requisition?: mongoose.Types.ObjectId;
  bid?: mongoose.Types.ObjectId;
  parentComment?: mongoose.Types.ObjectId;
  taggedUsers?: mongoose.Types.ObjectId[];
  isDeleted?: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requisition: {
      type: Schema.Types.ObjectId,
      ref: "Requisition",
    },
    bid: {
      type: Schema.Types.ObjectId,
      ref: "Bid",
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    taggedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

CommentSchema.index({ requisition: 1 });
CommentSchema.index({ bid: 1 });
CommentSchema.index({ parentComment: 1 });
CommentSchema.index({ requisition: 1, createdAt: -1 });
CommentSchema.index({ bid: 1, createdAt: -1 });
CommentSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model<CommentDocument>("Comment", CommentSchema);
