#!/usr/bin/env node

/**
 * One-time, idempotent administrator provisioning script.
 *
 * Safety properties:
 * - Requires ADMIN_EMAIL from the environment (or .env loaded locally).
 * - Reads the initial password from an interactive hidden prompt only.
 * - Never accepts or prints passwords, password hashes, or database secrets.
 * - Refuses to promote or modify an existing non-admin account.
 * - Refuses to reset an existing admin's password.
 * - Requires explicit typed confirmation before any database write.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const MIN_PASSWORD_LENGTH = 12;
const CONFIRM_PREFIX = "CREATE ADMIN IN";

function loadDotEnvIfPresent() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    if (!/^[A-Z0-9_]+$/.test(key) || process.env[key] !== undefined) continue;

    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function assertValidEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("ADMIN_EMAIL must be a valid email address.");
  }
}

function describeDatabase(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    const host = parsed.hostname || "unknown-host";
    const databaseName = parsed.pathname.replace(/^\//, "") || "unknown-database";
    const isLocal = ["localhost", "127.0.0.1", "::1"].includes(host);
    const isNeon = host.includes("neon.tech");
    const classification = process.env.ADMIN_PROVISION_TARGET || (isLocal ? "development" : isNeon ? "production-or-staging-neon" : "remote-unknown");

    return {
      host,
      databaseName,
      classification,
    };
  } catch {
    throw new Error("DATABASE_URL is not a valid URL.");
  }
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

async function promptHidden(question) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Password prompt requires an interactive TTY. Do not pass passwords as command-line arguments.");
  }

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const wasRaw = stdin.isRaw;
    let value = "";

    function cleanup() {
      stdin.off("data", onData);
      if (stdin.isTTY) stdin.setRawMode(Boolean(wasRaw));
      stdin.pause();
      stdout.write("\n");
    }

    function onData(chunk) {
      const text = chunk.toString("utf8");
      for (const char of text) {
        const code = char.charCodeAt(0);
        if (code === 3) {
          cleanup();
          reject(new Error("Aborted."));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (code === 8 || code === 127) {
          value = value.slice(0, -1);
          continue;
        }
        value += char;
      }
    }

    stdout.write(question);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.on("data", onData);
  });
}

async function main() {
  if (process.argv.length > 2) {
    throw new Error("This script does not accept command-line arguments. Configure ADMIN_EMAIL in the environment and enter the password interactively.");
  }

  loadDotEnvIfPresent();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || "");
  if (!adminEmail) throw new Error("ADMIN_EMAIL is required. Set it to the administrator email to provision.");
  assertValidEmail(adminEmail);

  const db = describeDatabase(databaseUrl);
  console.log("Admin provisioning target:");
  console.log(`- Environment classification: ${db.classification}`);
  console.log(`- Database host: ${db.host}`);
  console.log(`- Database name: ${db.databaseName}`);
  console.log(`- Admin email: ${adminEmail}`);

  const prisma = new PrismaClient({ log: ["error"] });

  try {
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, email: true, role: true, passwordHash: true },
    });

    if (existing?.role === Role.ADMIN) {
      console.log("An ADMIN account with this email already exists. No changes were made.");
      if (!existing.passwordHash) {
        throw new Error("Existing ADMIN account has no password hash. Refusing to reset it in this script without explicit recovery procedure approval.");
      }
      return;
    }

    if (existing) {
      throw new Error(`A non-admin account already exists for ${adminEmail}. Refusing to promote or modify it silently.`);
    }

    const password = await promptHidden("Initial admin password (hidden): ");
    const passwordConfirm = await promptHidden("Confirm initial admin password (hidden): ");

    if (password !== passwordConfirm) throw new Error("Passwords do not match. No changes were made.");
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters. No changes were made.`);
    }

    const confirmationPhrase = `${CONFIRM_PREFIX} ${db.classification.toUpperCase()}`;
    const confirmation = await prompt(`Type \"${confirmationPhrase}\" to create the admin account: `);
    if (confirmation !== confirmationPhrase) {
      throw new Error("Confirmation did not match. No changes were made.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: process.env.ADMIN_NAME?.trim() || null,
        passwordHash,
        role: Role.ADMIN,
        isEmailVerified: true,
        emailVerified: new Date(),
      },
      select: { id: true },
    });

    console.log("ADMIN account created successfully. Password and hash were not printed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Admin provisioning failed.");
  process.exitCode = 1;
});
