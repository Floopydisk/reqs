import mongoose from "mongoose";
import dotenv from "dotenv";
import { db } from "../src/db";
import { users, departments, locations } from "../src/db/schema";
import User from "../src/models/user.model";
import Department from "../src/models/department.model";
import Location from "../src/models/location.model";

dotenv.config();

async function migrate() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB.");

  // Migrate Departments
  console.log("Migrating departments...");
  const deps = await Department.find();
  for (const dep of deps) {
    try {
      await db.insert(departments).values({
        id: dep._id.toString(),
        name: dep.name,
        code: dep.code,
        description: dep.description,
        headId: dep.head?.toString(),
      }).onConflictDoNothing();
    } catch (err: any) {
      console.log(`Failed to migrate department ${dep.name}:`, err.message);
    }
  }
  
  // Migrate Locations
  console.log("Migrating locations...");
  const locs = await Location.find();
  for (const loc of locs) {
    try {
      await db.insert(locations).values({
        id: loc._id.toString(),
        name: loc.name,
        address: loc.address,
        contactPerson: loc.contactPerson,
        phoneNumber: loc.phoneNumber,
        email: loc.email,
      }).onConflictDoNothing();
    } catch (err: any) {
      console.log(`Failed to migrate location ${loc.name}:`, err.message);
    }
  }

  // Migrate Users
  console.log("Migrating users...");
  const allUsers = await User.find();
  for (const user of allUsers) {
    try {
      await db.insert(users).values({
        id: user._id.toString(),
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: user.password || "",
        role: user.role,
        departmentId: user.department?.toString(),
        designation: user.designation,
        designationId: user.designationId,
        profileImage: user.profileImage,
        isActive: user.isActive,
        isApproved: user.isApproved,
      }).onConflictDoNothing();
    } catch (err: any) {
      console.log(`Failed to migrate user ${user.email}:`, err.message);
    }
  }

  console.log("Migration complete!");
  process.exit(0);
}

migrate();
