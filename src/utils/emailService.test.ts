import assert from "node:assert/strict";
import test from "node:test";
import emailService from "./emailService";

test("sends through the provider only when email notifications are enabled", async () => {
  const originalEnabled = process.env.NOTIFY_EMAIL_ENABLED;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFetch = globalThis.fetch;
  const requests: RequestInit[] = [];

  process.env.RESEND_API_KEY = "test-api-key";
  globalThis.fetch = async (_input, init) => {
    requests.push(init ?? {});
    return new Response(null, { status: 200 });
  };

  try {
    process.env.NOTIFY_EMAIL_ENABLED = "false";
    await emailService.sendEmail({
      to: "recipient@example.invalid",
      subject: "Disabled test",
    });
    assert.equal(requests.length, 0);

    process.env.NOTIFY_EMAIL_ENABLED = "true";
    await emailService.sendEmail({
      to: "recipient@example.invalid",
      subject: "Enabled test",
    });
    assert.equal(requests.length, 1);
    assert.equal(
      (requests[0].headers as Record<string, string>).Authorization,
      "Bearer test-api-key",
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnabled === undefined) delete process.env.NOTIFY_EMAIL_ENABLED;
    else process.env.NOTIFY_EMAIL_ENABLED = originalEnabled;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
  }
});
