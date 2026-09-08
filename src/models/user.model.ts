import mongoose, { Schema } from "mongoose";
import { IUser } from "../types/interfaces";
import { UserRole } from "../types/enums";
import bcrypt from "bcrypt";

const userSchema = new Schema<IUser>(
  {
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: function (this: IUser) {
        // @deprecated - VENDOR role removed
        return false; // Password not required by default
      },
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STAFF,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    designationId: {
      type: String,
      required: true,
      trim: true,
    },
    // @deprecated - vendor field removed
    // vendor: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Vendor",
    // },
    profileImage: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    // resetPasswordToken: { type: String },
    // resetPasswordExpire: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password as string, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

// Index for faster queries
userSchema.index({ employeeId: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ department: 1 });
userSchema.index({ role: 1 });

export default mongoose.model<IUser>("User", userSchema);
