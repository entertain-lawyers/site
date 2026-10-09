import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const subjects = await prisma.subject.findMany({
        orderBy: { name: 'asc' }
    });

    console.log(`Total subjects found: ${subjects.length}`);
    
    // Check for the 65 newly created subjects. They had slug: semConfig.name + '-' + subConfig.name normalized
    const e3Subjects = subjects.filter(s => s.slug && s.slug.includes('semester'));
    console.log(`Subjects with 'semester' in slug (likely from E.3): ${e3Subjects.length}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
