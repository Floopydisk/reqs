import mongoose, { Schema } from 'mongoose';
import { IDepartment } from '../types/interfaces';

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

export default mongoose.model<IDepartment>('Department', departmentSchema);