import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const maxAttempts = 5;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    const users = await prisma.user.count();
    console.log("✓ Database connected");
    console.log(`✓ User table exists (${users} users)`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    if (attempt === maxAttempts) {
      console.error("✗ Database failed after retries:", error.message);
      await prisma.$disconnect();
      process.exit(1);
    }
    console.log(`… attempt ${attempt} failed, retrying in 2s`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}
