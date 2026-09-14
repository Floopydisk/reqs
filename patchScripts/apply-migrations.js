const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { Pool } = require('pg');
require('dotenv').config();

const run = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL + '?sslmode=no-verify',
  });
  const db = drizzle(pool);
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete!');
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
