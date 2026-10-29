import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const targetEmail = (args[0] || process.env.ADMIN_EMAIL || 'admin@entertainlawyers.com').trim().toLowerCase();
  const rawPassword = args[1];

  if (!rawPassword) {
    console.error('Usage: npx tsx scripts/set-admin-password.ts <email> <newPassword>');
    console.error('Example: npx tsx scripts/set-admin-password.ts admin@entertainlawyers.com Admin123!');
    process.exit(1);
  }

  if (rawPassword.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  const saltRounds = 10;
  const hash = await bcrypt.hash(rawPassword, saltRounds);

  const user = await prisma.user.upsert({
    where: { email: targetEmail },
    update: {
      passwordHash: hash,
      role: Role.ADMIN,
      isEmailVerified: true,
      emailVerified: new Date(),
      sessionVersion: 0,
    },
    create: {
      email: targetEmail,
      passwordHash: hash,
      role: Role.ADMIN,
      isEmailVerified: true,
      emailVerified: new Date(),
      sessionVersion: 0,
    },
    select: {
      id: true,
      email: true,
      role: true,
      isEmailVerified: true,
    },
  });

  console.log('✅ Admin password updated successfully!');
  console.log(`- User ID: ${user.id}`);
  console.log(`- Email: ${user.email}`);
  console.log(`- Role: ${user.role}`);
  console.log(`- Email Verified: ${user.isEmailVerified}`);
  console.log('\nYou can now log in at /login with these credentials.');
}

main()
  .catch((e) => {
    console.error('❌ Failed to set admin password:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
