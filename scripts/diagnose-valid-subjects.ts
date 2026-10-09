import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const semesters = await prisma.semester.findMany();
    const semIds = semesters.map(s => s.id);

    const subjects = await prisma.subject.findMany();
    
    let validWithValidSem = 0;
    let validWithInvalidSem = 0;

    for (const sub of subjects) {
        if (!sub.slug || !sub.slug.includes('semester')) {
            if (semIds.includes(sub.semesterId)) {
                validWithValidSem++;
            } else {
                validWithInvalidSem++;
            }
        }
    }
    console.log(`Valid subjects pointing to one of the 10 current semesters: ${validWithValidSem}`);
    console.log(`Valid subjects pointing to a deleted/unknown semester: ${validWithInvalidSem}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
