import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { createIntranetRequestSignature } from "./intranetRequestSignature";

test("creates a timestamped signature the intranet can reproduce", () => {
  const url = "https://intranet.example/api/staff?mode=lookup";
  const body = '{"email":"staff@daystarng.org"}';
  const secret = "shared-private-bypass";
  const timestamp = 1_797_000_000;
  const nonce = "0123456789abcdef0123456789abcdef";
  const canonicalRequest = [
    "v1",
    String(timestamp),
    nonce,
    "POST",
    "/api/staff?mode=lookup",
    body,
  ].join("\n");
  const expectedSignature = createHmac("sha256", secret)
    .update(canonicalRequest, "utf8")
    .digest("hex");

  assert.deepEqual(
    createIntranetRequestSignature(url, body, secret, timestamp, nonce),
    {
      timestamp: String(timestamp),
      nonce,
      signature: `v1=${expectedSignature}`,
    }
  );
});

test("rejects non-HTTPS intranet endpoints outside loopback", () => {
  assert.throws(
    () =>
      createIntranetRequestSignature(
        "http://intranet.example/api/staff",
        "{}",
        "secret",
        1_797_000_000
      ),
    /must use HTTPS/
  );
});
