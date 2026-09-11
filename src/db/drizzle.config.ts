import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env file.
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. drizzle-kit may fail.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle", // Output directory for migrations.
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  verbose: true, // Enable verbose output.
});
