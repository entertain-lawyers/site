import { afterEach, describe, expect, it, vi } from 'vitest';

describe('consultation emails', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('escapes the visitor name and advocate name in the acknowledgement email', async () => {
    // No SMTP in tests: sendEmail prints the message, tags stripped.
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
      logs.push(String(line));
    });
    const { sendConsultationClientAckEmail, escapeHtml } = await import('@/lib/mail');

    expect(escapeHtml('<b>"Ram" & \'Sita\'</b>')).toBe(
      '&lt;b&gt;&quot;Ram&quot; &amp; &#039;Sita&#039;&lt;/b&gt;'
    );

    await sendConsultationClientAckEmail({
      recipient: 'victim@example.com',
      fullName: '<a href="https://evil.example">Verify your account</a>',
      requestId: 'req-1',
      lawyerName: '<img src=x onerror=alert(1)>',
    });

    const body = logs.join('\n');
    // Escaped text survives tag stripping; raw markup would have been removed.
    expect(body).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;Verify your account&lt;/a&gt;');
    expect(body).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});

describe('password reset email', () => {
  it('builds branded HTML and a plain-text alternative carrying the OTP', async () => {
    const { buildPasswordResetEmail } = await import('@/lib/mail');
    const { html, text } = buildPasswordResetEmail('042915');

    // OTP dynamically inserted (preheader + code block), no leftovers from
    // the old gradient template
    expect(html.match(/042915/g)?.length).toBeGreaterThanOrEqual(2);
    expect(text).toContain('042915');
    expect(html).not.toContain('linear-gradient');

    // Official production wordmark, HTTPS, meaningful alt text
    expect(html).toContain('https://www.entertainlawyers.com/wordmark_white.png');
    expect(html).toContain('alt="Entertain Lawyers"');

    // Required content
    expect(html).toContain('Reset your password');
    expect(html).toContain('5 minutes');
    expect(html).toContain("Didn't request this?");
    expect(text).toContain('Verification Code: 042915');
    expect(text).toContain('expires in 5 minutes');

    // Table-based, inline-styled, no web fonts or scripts
    expect(html).toContain('role="presentation"');
    expect(html).not.toMatch(/<script|@import|fonts\.googleapis/);
  });

  it('renders six digits with spacing and survives a very long recipient', async () => {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
      logs.push(String(line));
    });
    const { sendPasswordResetOTP } = await import('@/lib/mail');

    const longEmail = `${'x'.repeat(60)}+tag@mailing-list.subdomain.example-lawyers-offices.com`;
    await sendPasswordResetOTP(longEmail, '770123');

    const body = logs.join('\n');
    expect(body).toContain(`TO: ${longEmail}`);
    expect(body).toContain('770123');
  });
});
