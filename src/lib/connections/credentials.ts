import fs from "fs";
import crypto from "crypto";
import os from "os";
import path from "path";
import { getCredentialsPath } from "@/lib/claude/paths";

// Simple AES-256 encryption for credential storage
// Uses a machine-derived key as fallback when OS keychain isn't available

function getMachineKey(): Buffer {
  const machineId = `${os.hostname()}-${os.userInfo().username}-exeflow`;
  return crypto.createHash("sha256").update(machineId).digest();
}

function encrypt(text: string): string {
  const key = getMachineKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(encrypted: string): string {
  const key = getMachineKey();
  const [ivHex, encryptedText] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function readCredentials(): Record<string, Record<string, string>> {
  const credPath = getCredentialsPath();
  if (!fs.existsSync(credPath)) return {};
  try {
    const raw = fs.readFileSync(credPath, "utf8");
    const data = JSON.parse(raw);
    // Decrypt all values
    const result: Record<string, Record<string, string>> = {};
    for (const [section, values] of Object.entries(data)) {
      result[section] = {};
      for (const [key, encValue] of Object.entries(values as Record<string, string>)) {
        try {
          result[section][key] = decrypt(encValue);
        } catch {
          result[section][key] = encValue; // Fallback: treat as plain text
        }
      }
    }
    return result;
  } catch {
    return {};
  }
}

function writeCredentials(data: Record<string, Record<string, string>>): void {
  const credPath = getCredentialsPath();
  const dir = path.dirname(credPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Encrypt all values
  const encrypted: Record<string, Record<string, string>> = {};
  for (const [section, values] of Object.entries(data)) {
    encrypted[section] = {};
    for (const [key, value] of Object.entries(values)) {
      encrypted[section][key] = encrypt(value);
    }
  }
  fs.writeFileSync(credPath, JSON.stringify(encrypted, null, 2), { mode: 0o600 });
}

export function getCredential(section: string, key: string): string | null {
  const creds = readCredentials();
  return creds[section]?.[key] ?? null;
}

export function setCredential(section: string, key: string, value: string): void {
  const creds = readCredentials();
  if (!creds[section]) creds[section] = {};
  creds[section][key] = value;
  writeCredentials(creds);
}

export function deleteCredential(section: string, key?: string): void {
  const creds = readCredentials();
  if (key) {
    delete creds[section]?.[key];
  } else {
    delete creds[section];
  }
  writeCredentials(creds);
}

export function hasCredential(section: string, key: string): boolean {
  return getCredential(section, key) !== null;
}
