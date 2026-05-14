import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "./env";

const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  if (!env.APP_ENCRYPTION_KEY) {
    throw new Error("APP_ENCRYPTION_KEY is required to encrypt Plaid access tokens.");
  }

  const keyBuffer = Buffer.from(env.APP_ENCRYPTION_KEY, "base64");
  if (keyBuffer.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be a base64-encoded 32-byte value.");
  }

  return keyBuffer;
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivBase64, authTagBase64, cipherBase64] = payload.split(":");
  if (!ivBase64 || !authTagBase64 || !cipherBase64) {
    throw new Error("Encrypted payload format is invalid.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivBase64, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(cipherBase64, "base64")),
    decipher.final()
  ]);
  return plaintext.toString("utf8");
}
