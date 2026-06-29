import { PrismaClient } from "@prisma/client";
import { seedRegistry } from "../src/lib/seed-data";

const prisma = new PrismaClient();

async function main() {
  const result = await seedRegistry(prisma);
  console.log(result.message);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
