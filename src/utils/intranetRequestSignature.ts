import { createHmac, randomBytes } from "crypto";

export interface IntranetRequestSignature {
  timestamp: string;
  nonce: string;
  signature: string;
}

export const createIntranetRequestSignature = (
  url: string,
  body: string,
  secret: string,
  timestampSeconds = Math.floor(Date.now() / 1000),
  nonce = randomBytes(16).toString("hex")
): IntranetRequestSignature => {
  if (!secret) {
    throw new Error("Intranet signing secret is required");
  }

  const target = new URL(url);
  if (
    target.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname)
  ) {
    throw new Error("Intranet authentication requests must use HTTPS");
  }

  const timestamp = String(timestampSeconds);
  const canonicalRequest = [
    "v1",
    timestamp,
    nonce,
    "POST",
    `${target.pathname}${target.search}`,
    body,
  ].join("\n");
  const signature = createHmac("sha256", secret)
    .update(canonicalRequest, "utf8")
    .digest("hex");

  return { timestamp, nonce, signature: `v1=${signature}` };
};
