import mongoose from "mongoose";

// Define the counter schema
interface ICounter extends mongoose.Document {
  prefix: string;
  period: string;
  sequence: number;
}

const CounterSchema = new mongoose.Schema<ICounter>({
  prefix: {
    type: String,
    required: true,
  },
  period: {
    type: String,
    required: true,
  },
  sequence: {
    type: Number,
    default: 0,
  },
});

// Create a compound index on prefix and period to ensure uniqueness
CounterSchema.index({ prefix: 1, period: 1 }, { unique: true });

// Create the Counter model if it doesn't exist
const Counter =
  mongoose.models.Counter || mongoose.model<ICounter>("Counter", CounterSchema);

/**
 * Generate a sequential ID with the format PREFIX-PERIOD-SEQUENCE
 * @param prefix The prefix for the ID (e.g., 'PO' for Purchase Order)
 * @param period The period for the ID (e.g., '2305' for May 2023)
 * @param digits The number of digits for the sequence (default: 4)
 * @returns A sequential ID string
 */
export const generateSequentialId = async (
  prefix: string,
  period = "",
  digits = 4,
): Promise<string> => {
  try {
    // Find and update the counter, or create a new one if it doesn't exist
    const counter = await Counter.findOneAndUpdate(
      { prefix, period },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true },
    );

    // Format the sequence number with leading zeros
    const sequence = counter.sequence.toString().padStart(digits, "0");

    // Return the formatted ID
    return period ? `${prefix}-${period}-${sequence}` : `${prefix}-${sequence}`;
  } catch (error) {
    console.error("Error generating sequential ID:", error);
    throw new Error("Failed to generate sequential ID");
  }
};

/**
 * Reset a counter to a specific value
 * @param prefix The prefix for the ID
 * @param period The period for the ID
 * @param value The value to reset the counter to
 */
export const resetCounter = async (
  prefix: string,
  period = "",
  value = 0,
): Promise<void> => {
  try {
    await Counter.findOneAndUpdate(
      { prefix, period },
      { sequence: value },
      { upsert: true },
    );
  } catch (error) {
    console.error("Error resetting counter:", error);
    throw new Error("Failed to reset counter");
  }
};

/**
 * Get the current sequence value for a counter
 * @param prefix The prefix for the ID
 * @param period The period for the ID
 * @returns The current sequence value
 */
export const getCurrentSequence = async (
  prefix: string,
  period = "",
): Promise<number> => {
  try {
    const counter = await Counter.findOne({ prefix, period });
    return counter ? counter.sequence : 0;
  } catch (error) {
    console.error("Error getting current sequence:", error);
    throw new Error("Failed to get current sequence");
  }
};
