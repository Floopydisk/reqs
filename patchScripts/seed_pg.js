const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { users, departments } = require('./dist/db/schema');
require('dotenv').config();

const run = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL + '?sslmode=no-verify',
  });
  const db = drizzle(pool);
  console.log('Seeding PG...');

  try {
    await db.insert(departments).values({
      id: "12",
      name: "Information Technology",
      code: "IT",
      description: "IT Department",
    }).onConflictDoNothing();

    await db.insert(users).values({
      id: "1",
      employeeId: "47",
      firstName: "Taiwo",
      lastName: "Ademoye",
      email: "taiwo@daystarng.org",
      role: "STAFF",
      departmentId: "12",
      designation: "IT Officer",
      designationId: "14",
      isActive: true,
      isApproved: true,
    }).onConflictDoNothing();

    await db.insert(users).values({
      id: "2",
      employeeId: "29",
      firstName: "PM",
      lastName: "User",
      email: "pm@daystarng.org",
      role: "STAFF",
      departmentId: "12",
      designation: "Project Manager",
      designationId: "15",
      isActive: true,
      isApproved: true,
    }).onConflictDoNothing();

    console.log('Seeding complete!');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
};

run();
