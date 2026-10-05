const fs = require('fs');
let code = fs.readFileSync('src/lib/auth.ts', 'utf8');

code = code.replace(
  '  const { email, password } = parsed.data;',
  '  const { email, password } = parsed.data;\n  console.log("[AUTH DEBUG] email received:", email);'
);

code = code.replace(
  '  const user = await prisma.user.findUnique({',
  '  const user = await prisma.user.findUnique({'
); // Keep intact, find where it finishes

const replacement = `
  console.log("[AUTH DEBUG] user found:", !!user);
  if (user) {
    console.log("[AUTH DEBUG] user role:", user.role);
    console.log("[AUTH DEBUG] passwordHash exists:", !!user.passwordHash);
    console.log("[AUTH DEBUG] isEmailVerified:", user.isEmailVerified);
    console.log("[AUTH DEBUG] emailVerified:", user.emailVerified);
    console.log("[AUTH DEBUG] passwordHash prefix:", user.passwordHash ? user.passwordHash.substring(0, 10) : "none");
  }

  // Dummy hash to prevent timing attacks on non-existent users
`;
code = code.replace('  // Dummy hash to prevent timing attacks on non-existent users\n', replacement);

const passwordsMatchReplacement = `
  console.log("[AUTH DEBUG] password comparison:", passwordsMatch);
  
  if (!user || !user.passwordHash) {
    console.log("[AUTH DEBUG] authorization result: rejected");
    console.log("[AUTH DEBUG] rejection reason: missing user or passwordHash");
    return null;
  }

  class UnverifiedEmail extends CredentialsSignin {
    code = "UnverifiedEmail"
  }

  if (!user.isEmailVerified && !user.emailVerified && user.role !== 'ADMIN') {
    console.log("[AUTH DEBUG] authorization result: rejected");
    console.log("[AUTH DEBUG] rejection reason: email not verified");
    throw new UnverifiedEmail('Please verify your email address before logging in.');
  }

  if (passwordsMatch) {
    console.log("[AUTH DEBUG] authorization result: accepted");
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
  
  console.log("[AUTH DEBUG] authorization result: rejected");
  console.log("[AUTH DEBUG] rejection reason: passwordsMatch is false");
  return null;
`;

code = code.replace(/  if \(\!user \|\| \!user\.passwordHash\) \{[\s\S]*?return null;\n  \}/, passwordsMatchReplacement.trim());

fs.writeFileSync('src/lib/auth.ts', code);
