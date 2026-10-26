import nodemailer from 'nodemailer';

// In a real production app, you would use actual SMTP credentials from your .env
// e.g., process.env.SMTP_HOST, process.env.SMTP_USER, etc.
// For now, if no credentials are provided, we will just log the email to the console.

const isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (isConfigured && transporter) {
    await transporter.sendMail({
      from: `"Entertain Lawyers" <${process.env.SMTP_FROM || 'noreply@entertainlawyers.com'}>`,
      to,
      subject,
      html,
    });
  } else if (process.env.NODE_ENV !== 'production') {
    // Development fallback: print the message so local sign-up and password
    // reset flows can be tested without an SMTP server.
    console.log('\n=================== EMAIL SENT ===================');
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CONTENT: \n${html.replace(/<[^>]+>/g, '')}`); // Strip HTML tags for console readability
    console.log('==================================================\n');
  } else {
    // Never log recipients, OTPs, or message bodies in production. Logging the
    // subject is enough to notice that mail is misconfigured without leaking
    // credentials or personal data into the platform logs.
    console.error('[mail] SMTP is not configured; email was not sent.', { subject });
  }
}

export async function sendVerificationOTP(email: string, token: string) {
  await sendEmail({
    to: email,
    subject: 'Verify your email address - Entertain Lawyers',
    html: `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; text-align: center;">
        <h1 style="color: #0d2342;">Welcome to Entertain Lawyers!</h1>
        <p>Please use the following 6-digit code to verify your email address. This code will expire in 15 minutes.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h2 style="font-size: 32px; letter-spacing: 5px; color: #2563eb; margin: 0;">${token}</h2>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetOTP(email: string, token: string) {
  await sendEmail({
    to: email,
    subject: 'Reset your password - Entertain Lawyers',
    html: `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; text-align: center;">
        <h1 style="color: #0d2342;">Reset Your Password</h1>
        <p>You requested a password reset. Please use the following 6-digit code to reset your password. This code will expire in 15 minutes.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h2 style="font-size: 32px; letter-spacing: 5px; color: #e11d48; margin: 0;">${token}</h2>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
}
