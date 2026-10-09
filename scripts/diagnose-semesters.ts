import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Diagnostic: Semesters in Current DB ---");
    const dbUrl = process.env.DATABASE_URL;
    // Safely print if it contains the known production string without leaking credentials
    if (dbUrl?.includes('ep-delicate-silence-b36jbzw5')) {
        console.log("Connected to: Production (ep-delicate-silence-b36jbzw5)");
    } else {
        console.log("Connected to: Unknown or Preview");
    }

    const semesters = await prisma.semester.findMany({
        orderBy: { order: 'asc' }
    });

    console.log(`Total semesters found: ${semesters.length}`);
    for (const sem of semesters) {
        console.log(`- ID: ${sem.id} | Name: ${sem.name} | Slug: ${sem.slug} | Order: ${sem.order}`);
    }

    const subjects = await prisma.subject.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    console.log(`\nSample of 5 most recently created subjects:`);
    for (const sub of subjects) {
        console.log(`- ID: ${sub.id} | Name: ${sub.name} | Slug: ${sub.slug} | CreatedAt: ${sub.createdAt}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
