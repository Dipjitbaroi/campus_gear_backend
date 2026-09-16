import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient } from "../../generated/prisma/client.js";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({
  adapter,
  transactionOptions: {
    // The default 2-second acquisition window can be too short for pooled or
    // cold database connections, including Stripe webhook bursts.
    maxWait: 10_000,
    timeout: 10_000,
  },
});

export { prisma };
