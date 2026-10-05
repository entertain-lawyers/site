const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function run() {
    const resources = await prisma.resource.findMany({
        where: { type: 'STUDY_MATERIAL' }, // Wait, they might be LAW_NOTE?
        select: { id: true, title: true, type: true, documentId: true, status: true }
    });
    console.log("Total resources:", resources.length);
    for (const r of resources) {
        console.log(`- ID: ${r.id} | Title: ${r.title}`);
    }
}
run().finally(() => prisma.$disconnect());
