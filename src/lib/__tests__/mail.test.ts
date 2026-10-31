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
