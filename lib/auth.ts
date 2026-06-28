import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  database: pool,
});
