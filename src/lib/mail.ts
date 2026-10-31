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
      // Nodemailer waits up to two minutes by default. Callers await delivery
      // inside a request, so an unreachable SMTP host must fail fast instead.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

/** Escapes text interpolated into email HTML (names and messages are user input). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendEmail({
  to,
  subject,
  html,
  critical = false,
}: {
  to: string;
  subject: string;
  html: string;
  /** Auth mail (OTP/reset) must fail loudly instead of silently succeeding. */
  critical?: boolean;
}) {
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
    if (critical) {
      // Verification/reset cannot work without mail. Returning success here
      // tells the user a code was sent when none was, and locks them out.
      throw new Error('Email delivery is not configured');
    }
  }
}

export async function sendVerificationOTP(email: string, token: string) {
  await sendEmail({
    to: email,
    critical: true,
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
    critical: true,
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

export interface ConsultationEmailData {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  preferredContactMethod: string;
  consultationMode: string;
  practiceArea: string;
  preferredTime?: string | null;
  claimAmount?: number | null;
  courtFeeEstimated?: number | null;
  subject: string;
  description: string;
  lawyerName?: string | null;
  createdAt: Date | string;
}

export async function sendConsultationNotificationEmail({
  recipient,
  request,
}: {
  recipient: string;
  request: ConsultationEmailData;
}) {
  const lawyerText = request.lawyerName
    ? `Advocate: ${request.lawyerName}`
    : 'General Chambers Consultation';

  const dateStr = typeof request.createdAt === 'string'
    ? new Date(request.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' })
    : request.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' });

  const escape = escapeHtml;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #0d2342; padding: 24px 30px; text-align: left;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Entertain Lawyers</h1>
        <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">New Legal Consultation Intake Notification</p>
      </div>

      <div style="padding: 24px 30px;">
        <div style="background: ${request.lawyerName ? '#eff6ff' : '#f8fafc'}; border: 1px solid ${request.lawyerName ? '#bfdbfe' : '#e2e8f0'}; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 12px; text-transform: uppercase; font-weight: 700; color: #2563eb; letter-spacing: 0.5px;">Selected Advocate / Counsel</p>
          <p style="margin: 4px 0 0; font-size: 17px; font-weight: 800; color: #0f172a;">${escape(lawyerText)}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 35%;">Client Name:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${escape(request.fullName)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Phone Number:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">
                <a href="tel:${escape(request.phone)}" style="color: #2563eb; text-decoration: none;">${escape(request.phone)}</a>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Email:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">
                <a href="mailto:${escape(request.email)}" style="color: #2563eb; text-decoration: none;">${escape(request.email)}</a>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Preferred Contact:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${escape(request.preferredContactMethod)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Consultation Mode:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${escape(request.consultationMode)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Legal Practice Area:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${escape(request.practiceArea)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Preferred Time Slot:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${escape(request.preferredTime || 'Any Time')}</td>
            </tr>
            ${request.claimAmount ? `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Dispute Claim:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">Rs. ${Number(request.claimAmount).toLocaleString('en-IN')}</td>
            </tr>
            ` : ''}
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Subject / Topic:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${escape(request.subject)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase;">Matter Summary & Inquiry Details:</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${escape(request.description)}</div>
        </div>

        <div style="background: #f1f5f9; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #64748b;">
          <strong>Case Reference ID:</strong> <span style="font-family: monospace; font-size: 13px; color: #0f172a;">${request.id}</span><br />
          <strong>Submitted At:</strong> ${dateStr} (Nepal Time)
        </div>
      </div>

      <div style="background-color: #f8fafc; padding: 16px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
        This is an automated notification from the Entertain Lawyers Chambers Intake System.
      </div>
    </div>
  `;

  await sendEmail({
    to: recipient,
    subject: `New Legal Consultation Request [${request.id.slice(0, 8)}] - ${request.fullName} ${request.lawyerName ? `(for ${request.lawyerName})` : ''}`,
    html,
  });
}

export async function sendConsultationClientAckEmail({
  recipient,
  fullName,
  requestId,
  lawyerName,
}: {
  recipient: string;
  fullName: string;
  requestId: string;
  lawyerName?: string | null;
}) {
  const lawyerText = lawyerName ? `Advocate ${lawyerName}` : 'our legal team';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #0d2342; padding: 24px 30px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">Entertain Lawyers</h1>
        <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Legal Counsel & Advocacy Chambers</p>
      </div>

      <div style="padding: 24px 30px;">
        <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin-top: 0;">Consultation Request Received</h2>
        <p style="font-size: 14px; color: #334155; line-height: 1.6;">
          Dear <strong>${escapeHtml(fullName)}</strong>,
        </p>
        <p style="font-size: 14px; color: #334155; line-height: 1.6;">
          Thank you for reaching out to Entertain Lawyers. Your legal consultation request has been safely logged in our chambers registry.
          ${lawyerName ? `Your inquiry has been designated for review with <strong>${escapeHtml(lawyerText)}</strong>.` : ''}
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">Case Reference ID:</p>
          <p style="margin: 4px 0 0; font-family: monospace; font-size: 16px; font-weight: 700; color: #2563eb;">${requestId}</p>
        </div>

        <p style="font-size: 14px; color: #334155; line-height: 1.6;">
          An advocate from our chambers will review your matter and contact you within <strong>1 business day</strong> via your preferred contact channel to confirm your appointment time and next steps.
        </p>

        <div style="border-top: 1px solid #f1f5f9; margin-top: 24px; padding-top: 16px; font-size: 13px; color: #64748b;">
          <strong>Chambers Contact:</strong><br />
          Phone: +977 9822010737 | Email: contact@entertainlawyers.com<br />
          Location: Prithvi Narayan Law Campus, Pokhara, Nepal
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to: recipient,
    subject: `Consultation Request Received - Entertain Lawyers [Ref: ${requestId.slice(0, 8)}]`,
    html,
  });
}

