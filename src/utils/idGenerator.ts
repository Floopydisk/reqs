import { createPool } from "../db";

/**
 * Generate a sequential ID with the format PREFIX-PERIOD-SEQUENCE using PostgreSQL
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
    const pool = createPool();
    const id = `${prefix}:${period}`;
    const result = await pool.query(
      `INSERT INTO counters (id, prefix, period, sequence)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (id) DO UPDATE SET sequence = counters.sequence + 1
       RETURNING sequence;`,
      [id, prefix, period]
    );

    const seqNumber = result.rows[0]?.sequence || 1;
    const sequence = seqNumber.toString().padStart(digits, "0");

    return period ? `${prefix}-${period}-${sequence}` : `${prefix}-${sequence}`;
  } catch (error) {
    console.error("Error generating sequential ID in PostgreSQL:", error);
    throw new Error("Failed to generate sequential ID");
  }
};

/**
 * Reset a counter to a specific value in PostgreSQL
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
    const pool = createPool();
    const id = `${prefix}:${period}`;
    await pool.query(
      `INSERT INTO counters (id, prefix, period, sequence)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET sequence = $4;`,
      [id, prefix, period, value]
    );
  } catch (error) {
    console.error("Error resetting counter in PostgreSQL:", error);
    throw new Error("Failed to reset counter");
  }
};

/**
 * Get the current sequence value for a counter from PostgreSQL
 * @param prefix The prefix for the ID
 * @param period The period for the ID
 * @returns The current sequence value
 */
export const getCurrentSequence = async (
  prefix: string,
  period = "",
): Promise<number> => {
  try {
    const pool = createPool();
    const id = `${prefix}:${period}`;
    const result = await pool.query(
      `SELECT sequence FROM counters WHERE id = $1;`,
      [id]
    );
    return result.rows[0]?.sequence ? Number(result.rows[0].sequence) : 0;
  } catch (error) {
    console.error("Error getting current sequence from PostgreSQL:", error);
    throw new Error("Failed to get current sequence");
  }
};

