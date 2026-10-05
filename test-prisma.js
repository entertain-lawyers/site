const { PrismaClient, ResourceType } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const session = { user: { id: "test-id" } };
    const resources = await prisma.resource.findMany({
      where: {
        OR: [
          { type: { notIn: [ResourceType.LAW_NOTE, ResourceType.CASE_LAW] } },
          { authorId: session.user.id }
        ]
      }
    });
    console.log("Success, found:", resources.length);
  } catch (e) {
    console.error("Prisma error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
