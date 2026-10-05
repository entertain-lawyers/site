require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function checkUser() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@entertainlawyers.com' } });
  if (user) {
    console.log("[AUTH DEBUG] user found:", !!user);
    console.log("[AUTH DEBUG] user role:", user.role);
    console.log("[AUTH DEBUG] passwordHash exists:", !!user.passwordHash);
    console.log("[AUTH DEBUG] isEmailVerified:", user.isEmailVerified);
    console.log("[AUTH DEBUG] emailVerified:", !!user.emailVerified);
    console.log("[AUTH DEBUG] passwordHash format:", user.passwordHash ? user.passwordHash.substring(0, 7) : 'N/A');
    
    // Check if it's a valid bcrypt hash
    const isValidBcryptFormat = user.passwordHash && user.passwordHash.startsWith('$') && user.passwordHash.length === 60;
    console.log("[AUTH DEBUG] isValidBcryptFormat:", isValidBcryptFormat);
  } else {
    console.log("[AUTH DEBUG] admin@entertainlawyers.com NOT FOUND in this database.");
    
    const allUsers = await prisma.user.findMany();
    console.log("Found users:");
    allUsers.forEach(u => console.log("- " + u.email));
  }
}

checkUser().finally(() => prisma.$disconnect());
