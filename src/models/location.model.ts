import mongoose, { Schema } from "mongoose";
import { ILocation } from "../types/interfaces";
import { syncLocationToPostgres } from "../utils/pgSync";

const locationSchema = new Schema<ILocation>(
  {
    name: {
      type: String,
      required: [true, "Location name is required"],
      unique: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
  },
  { timestamps: true }
);

locationSchema.post("save", async function (doc, next) {
  try {
    await syncLocationToPostgres(doc);
  } catch (err) {
    console.error("PG Sync error (location save):", err);
  }
  next();
});

locationSchema.post("findOneAndUpdate", async function (doc, next) {
  if (doc) {
    try {
      await syncLocationToPostgres(doc);
    } catch (err) {
      console.error("PG Sync error (location findOneAndUpdate):", err);
    }
  }
  next();
});

export default mongoose.model<ILocation>("Location", locationSchema);
