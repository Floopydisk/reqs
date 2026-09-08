import mongoose from "mongoose";

/**
 * Safely converts a value to a MongoDB ObjectId.
 * If the value is already an ObjectId, returns it unchanged.
 * If the value is a string, converts it to an ObjectId.
 * Otherwise, returns null.
 */
export const toObjectId = (value: any): mongoose.Types.ObjectId | null => {
  if (!value) return null;

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (typeof value === "string") {
    try {
      return new mongoose.Types.ObjectId(value);
    } catch (error) {
      console.error(`Invalid ObjectId format: ${value}`);
      return null;
    }
  }

  if (typeof value === "object" && value._id) {
    return toObjectId(value._id);
  }

  return null;
};

/**
 * Returns the ObjectId from a user object or string
 * Useful for getting the user ID from req.user
 */
export const getUserId = (user: any): mongoose.Types.ObjectId | null => {
  if (!user) return null;

  // Handle req.user with _id property
  if (user._id) {
    return toObjectId(user._id);
  }

  // In case the user is already an ID string or ObjectId
  return toObjectId(user);
};
