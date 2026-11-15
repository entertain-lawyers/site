import nodemailer from 'nodemailer';
import { UserFacingError } from '@/lib/safe-action';

// In a real production app, you would use actual SMTP credentials from your .env
// e.g., process.env.SMTP_HOST, process.env.SMTP_USER, etc.
// For now, if no credentials are provided, we will just log the email to the console.

const isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);

// Surface partial SMTP configuration: with host/user set but no password the
// transport would fail at AUTH time with a cryptic error instead of a clear one.
if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && !process.env.SMTP_PASS) {
  console.error('[mail] SMTP_PASS is missing; outgoing email is disabled.', {
    hasHost: true,
    hasPort: true,
    hasUser: true,
  });
}

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
  text,
  critical = false,
}: {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative for clients and delivery filters. */
  text?: string;
  /** Auth mail (OTP/reset) must fail loudly instead of silently succeeding. */
  critical?: boolean;
}) {
  if (isConfigured && transporter) {
    try {
      await transporter.sendMail({
        from: `"Entertain Lawyers" <${process.env.SMTP_FROM || 'noreply@entertainlawyers.com'}>`,
        to,
        subject,
        html,
        ...(text ? { text } : {}),
      });
    } catch (err) {
      // Log only the failure class (error code/name and subject) — never the
      // recipient, message body, credentials or SMTP conversation.
      const code = (err as { code?: string; name?: string })?.code || (err as { name?: string })?.name || 'unknown';
      console.error('[mail] SMTP send failed.', { code, subject });
      throw err;
    }
  } else if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_LOCAL_EMAIL_LOG === 'true') {
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
      throw new UserFacingError('Email delivery is not configured. Please contact the administrator.');
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
  const { html, text } = buildPasswordResetEmail(token);
  await sendEmail({
    to: email,
    critical: true,
    subject: 'Reset your password — Entertain Lawyers',
    html,
    text,
  });
}

/**
 * Production wordmark asset (same file the site header serves; white glyphs +
 * gold scales emblem, drawn for dark backgrounds). Kept as an absolute HTTPS
 * URL so email clients never resolve a relative path.
 */
const BRAND_WORDMARK_URL = 'https://www.entertainlawyers.com/wordmark_white.png';

/**
 * Pure builder for the password-reset email: table-based, inline-CSS layout
 * using the site's navy (#16325a/#0c1b30) and gold (#c9a227) palette. Returns
 * both the HTML body and a plain-text alternative.
 */
export function buildPasswordResetEmail(otp: string): { html: string; text: string } {
  const safeOtp = escapeHtml(otp);
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Reset your password — Entertain Lawyers</title>
  <style>
    @media only screen and (max-width: 620px) {
      .el-card { width: 100% !important; }
      .el-pad { padding-left: 24px !important; padding-right: 24px !important; }
      .el-otp { font-size: 30px !important; letter-spacing: 6px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f2f3f5;">
  <!-- Preheader: visible in inbox previews only -->
  <div style="display:none; font-size:1px; color:#f2f3f5; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
    Your Entertain Lawyers password reset code expires in 5 minutes.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f2f3f5;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600"><tr><td><![endif]-->
        <table role="presentation" class="el-card" border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; background-color:#ffffff; border-collapse:collapse;">

          <!-- Header: navy band with the official wordmark -->
          <tr>
            <td align="center" bgcolor="#0c1b30" style="background-color:#0c1b30; padding:28px 40px 22px; color:#ffffff; font-family:Georgia,'Times New Roman',serif; font-size:20px;" class="el-pad">
              <img src="${BRAND_WORDMARK_URL}"
                   width="300" height="80" alt="Entertain Lawyers"
                   style="display:block; width:300px; height:auto; max-width:300px; border:0; outline:none; text-decoration:none;" />
            </td>
          </tr>
          <!-- Gold rule beneath the header -->
          <tr>
            <td bgcolor="#c9a227" style="background-color:#c9a227; font-size:2px; line-height:2px;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="el-pad" style="padding:40px 48px 8px; font-family:Georgia,'Times New Roman',serif;">
              <h1 style="margin:0 0 16px; font-family:Georgia,'Times New Roman',serif; font-size:26px; line-height:34px; font-weight:normal; color:#16325a;">
                Reset your password
              </h1>
              <p style="margin:0 0 28px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:24px; color:#3a4a5f;">
                Hello,
              </p>
              <p style="margin:0 0 28px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:24px; color:#3a4a5f;">
                We received a request to reset the password for your Entertain Lawyers account.
                Use the verification code below to continue — it works only once.
              </p>
            </td>
          </tr>

          <!-- OTP block -->
          <tr>
            <td class="el-pad" style="padding:0 48px 8px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td align="center" bgcolor="#faf9f6" style="background-color:#faf9f6; border:1px solid #e3ddcf; border-top:3px solid #c9a227; padding:26px 16px;">
                    <p style="margin:0 0 14px; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:16px; letter-spacing:1.5px; text-transform:uppercase; color:#8a8f99; font-weight:bold;">
                      Verification Code
                    </p>
                    <div class="el-otp" style="font-family:'Courier New',Courier,monospace; font-size:36px; line-height:44px; font-weight:bold; letter-spacing:10px; color:#16325a;">
                      ${safeOtp}
                    </div>
                    <p style="margin:14px 0 0; font-family:Arial,Helvetica,sans-serif; font-size:13px; line-height:20px; color:#6b7280;">
                      This code expires in <strong style="color:#16325a;">5 minutes</strong> and can be used once.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security notice -->
          <tr>
            <td class="el-pad" style="padding:24px 48px 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td bgcolor="#f7f6f2" style="background-color:#f7f6f2; border-left:3px solid #c9a227; padding:16px 20px; font-family:Arial,Helvetica,sans-serif; font-size:13px; line-height:21px; color:#5a6472;">
                    <strong style="color:#16325a;">Didn't request this?</strong>
                    If this request wasn't made by you, you can safely ignore this email —
                    your password will remain unchanged. Nobody can reset it without
                    this code, which expires in five minutes.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="font-size:24px; line-height:24px;">&nbsp;</td></tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->

        <!-- Footer -->
        <table role="presentation" class="el-card" border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; background-color:#0c1b30; border-collapse:collapse;">
          <tr>
            <td align="center" class="el-pad" style="padding:26px 40px; font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 6px; font-family:Georgia,'Times New Roman',serif; font-size:15px; color:#ffffff;">
                Entertain Lawyers
              </p>
              <p style="margin:0 0 12px; font-family:Arial,Helvetica,sans-serif; font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:#c9a227;">
                Connecting with Legal Updates
              </p>
              <p style="margin:0 0 10px; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:18px; color:#aeb6c2;">
                Prithvi Narayan Law Campus, Pokhara, Nepal<br />
                contact@entertainlawyers.com
              </p>
              <p style="margin:14px 0 0; padding-top:12px; border-top:1px solid #1d2f47; font-family:Arial,Helvetica,sans-serif; font-size:11px; color:#7d8798;">
                &copy; ${year} Entertain Lawyers Pvt. Ltd. All rights reserved.<br />
                This is an automated message — please do not reply.
              </p>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `ENTERTAIN LAWYERS
Connecting with Legal Updates

RESET YOUR PASSWORD

We received a request to reset the password for your Entertain Lawyers
account. Use the verification code below to continue — it works only once.

Verification Code: ${otp}

This code expires in 5 minutes and can be used once.

Didn't request this? If this request wasn't made by you, you can safely
ignore this email — your password will remain unchanged. Nobody can reset
it without this code.

Need help? contact@entertainlawyers.com

Prithvi Narayan Law Campus, Pokhara, Nepal
© ${year} Entertain Lawyers Pvt. Ltd. All rights reserved.
This is an automated message — please do not reply.`;

  return { html, text };
}

export interface ConsultationEmailData {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsappNumber?: string | null;
  permanentAddress?: string | null;
  temporaryAddress?: string | null;
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
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">WhatsApp Number:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${escape(request.whatsappNumber || 'Same as phone')}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Permanent Address:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${escape(request.permanentAddress || 'Not provided')}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Temporary Address:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${escape(request.temporaryAddress || 'Not provided')}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Email:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${request.email ? `<a href="mailto:${escape(request.email)}" style="color: #2563eb; text-decoration: none;">${escape(request.email)}</a>` : 'Not provided'}</td>
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

