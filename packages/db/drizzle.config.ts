import type { Config } from "drizzle-kit";

const url = process.env["DATABASE_URL"];
if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");

export default {
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url },
} satisfies Config;
