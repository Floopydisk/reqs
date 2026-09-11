import mongoose, { Schema } from "mongoose";
import { IVendor } from "../types/interfaces";
import { syncVendorToPostgres } from "../utils/pgSync";

const vendorSchema = new Schema<IVendor>(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    contactPerson: {
      type: String,
      required: [true, "Contact person name is required"],
      trim: true,
    },
    contactPersonDesignation: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    website: {
      type: String,
      trim: true,
      match: [
        /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
        "Please use a valid URL",
      ],
    },
    dateOfIncorporation: {
      type: Date,
    },
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "VendorCategory",
        required: [true, "At least one business category is required"],
      },
    ],
    documents: [
      {
        name: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    cacDocument: {
      name: {
        type: String,
      },
      url: {
        type: String,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

vendorSchema.post("save", async function (doc, next) {
  try {
    await syncVendorToPostgres(doc);
  } catch (err) {
    console.error("PG Sync error (vendor save):", err);
  }
  next();
});

vendorSchema.post("findOneAndUpdate", async function (doc, next) {
  if (doc) {
    try {
      await syncVendorToPostgres(doc);
    } catch (err) {
      console.error("PG Sync error (vendor findOneAndUpdate):", err);
    }
  }
  next();
});

export default mongoose.model<IVendor>("Vendor", vendorSchema);
