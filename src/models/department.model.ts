import mongoose, { Schema } from 'mongoose';
import { IDepartment } from '../types/interfaces';
import { syncDepartmentToPostgres } from '../utils/pgSync';

const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      unique: true
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      trim: true,
      unique: true
    },
    description: {
      type: String,
      trim: true
    },
    head: {
      type: mongoose.Schema.Types.ObjectId as any,
      ref: 'User',
      required: false // Change from required: [true, 'Department head is required']
    },
    members: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  {
    timestamps: true
  }
);

departmentSchema.post("save", async function (doc, next) {
  try {
    await syncDepartmentToPostgres(doc);
  } catch (err) {
    console.error("PG Sync error (department save):", err);
  }
  next();
});

departmentSchema.post("findOneAndUpdate", async function (doc, next) {
  if (doc) {
    try {
      await syncDepartmentToPostgres(doc);
    } catch (err) {
      console.error("PG Sync error (department findOneAndUpdate):", err);
    }
  }
  next();
});

export default mongoose.model<IDepartment>('Department', departmentSchema);