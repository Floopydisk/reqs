/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-namespace */
import * as crypto from "crypto";

export class ObjectId {
  private _id: string;

  constructor(id?: any) {
    if (id instanceof ObjectId) {
      this._id = id._id;
    } else if (typeof id === "string" && id.length > 0) {
      this._id = id;
    } else if (id && typeof id === "object" && (id._id || id.id)) {
      this._id = String(id._id || id.id);
    } else {
      this._id = crypto.randomBytes(12).toString("hex");
    }
  }

  toString(): string {
    return this._id;
  }

  toHexString(): string {
    return this._id;
  }

  toJSON(): string {
    return this._id;
  }

  equals(other: any): boolean {
    if (!other) return false;
    const str = other instanceof ObjectId ? other._id : String(other);
    return this._id === str;
  }

  static isValid(id: any): boolean {
    if (!id) return false;
    const str = id instanceof ObjectId ? id._id : String(id);
    return /^[0-9a-fA-F]{24}$/.test(str) || (typeof str === "string" && str.trim().length > 0);
  }
}

export const generateId = (): string => crypto.randomBytes(12).toString("hex");

/**
 * Safely converts a value to an ObjectId compatible instance
 */
export const toObjectId = (value: any): any => {
  if (!value) return null;
  if (value instanceof ObjectId) return value;
  if (typeof value === "string") return new ObjectId(value);
  if (typeof value === "object" && (value._id || value.id)) {
    return new ObjectId(value._id || value.id);
  }
  return new ObjectId(String(value));
};

/**
 * Returns the ID from a user object or string
 * Useful for getting the user ID from req.user
 */
export const getUserId = (user: any): any => {
  if (!user) return null;
  if (user._id) return toObjectId(user._id);
  if (user.id) return toObjectId(user.id);
  return toObjectId(user);
};

export const isValidObjectId = (id: any): boolean => ObjectId.isValid(id);

export const startSession = async () => ({
  startTransaction: () => {},
  commitTransaction: async () => {},
  abortTransaction: async () => {},
  endSession: () => {},
});

export const Types = {
  ObjectId,
};

export interface ClientSession {
  startTransaction: () => void;
  commitTransaction: () => Promise<void>;
  abortTransaction: () => Promise<void>;
  endSession: () => void;
}

export const dbUtils = {
  Types,
  isValidObjectId,
  startSession,
  generateId,
  toObjectId,
  getUserId,
  ObjectId,
};

export default dbUtils;


