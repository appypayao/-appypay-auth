import { canViewPII } from "../permissions/guards";
import type { ResourceCode } from "../types";

const MASK_CHAR = "•";
const WHITESPACE_RE = /\s+/;
const NON_DIGIT_RE = /\D/g;
const WHITESPACE_GLOBAL_RE = /\s+/g;

const repeat = (char: string, count: number): string =>
  count > 0 ? char.repeat(count) : "";

/**
 * Masks the local part of an email while keeping the domain visible.
 *
 * `john.doe@example.com` → `••••@example.com`
 * Falls back to a fully-masked string when the input is not a valid email.
 */
export function maskEmail(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const atIndex = value.lastIndexOf("@");
  if (atIndex <= 0) {
    return repeat(MASK_CHAR, Math.max(value.length, 4));
  }
  return `${repeat(MASK_CHAR, 4)}${value.slice(atIndex)}`;
}

/**
 * Masks a phone number keeping only the last 2 digits.
 *
 * `+351 912 345 678` → `+•••••••••78`
 */
export function maskPhone(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const digits = value.replace(NON_DIGIT_RE, "");
  if (digits.length <= 2) {
    return repeat(MASK_CHAR, value.length);
  }
  const visible = digits.slice(-2);
  const prefix = value.startsWith("+") ? "+" : "";
  return `${prefix}${repeat(MASK_CHAR, digits.length - 2)}${visible}`;
}

/**
 * Masks an IBAN, keeping the last `visible` characters.
 *
 * `AO06000600000000000000001` → `XXXX...0001`
 */
export function maskIBAN(
  value: string | null | undefined,
  visible = 4
): string {
  if (!value) {
    return "";
  }
  const trimmed = value.replace(WHITESPACE_GLOBAL_RE, "");
  if (trimmed.length <= visible) {
    return repeat("X", trimmed.length);
  }
  return `XXXX...${trimmed.slice(-visible)}`;
}

/**
 * Masks a personal name, keeping only the first letter of each word.
 *
 * `John Doe` → `J••• D••`
 */
export function maskName(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value
    .split(WHITESPACE_RE)
    .filter(Boolean)
    .map(
      (word) => `${word[0]}${repeat(MASK_CHAR, Math.max(word.length - 1, 2))}`
    )
    .join(" ");
}

/**
 * Masks a tax id / national id, keeping the last `visible` characters.
 */
export function maskTaxId(
  value: string | null | undefined,
  visible = 3
): string {
  if (!value) {
    return "";
  }
  if (value.length <= visible) {
    return repeat(MASK_CHAR, value.length);
  }
  return `${repeat(MASK_CHAR, value.length - visible)}${value.slice(-visible)}`;
}

/**
 * Masks a card number, keeping only the last 4 digits.
 *
 * `4111111111111234` → `•••• •••• •••• 1234`
 */
export function maskLast4(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const digits = value.replace(NON_DIGIT_RE, "");
  if (digits.length <= 4) {
    return repeat(MASK_CHAR, value.length);
  }
  return `•••• •••• •••• ${digits.slice(-4)}`;
}

type MaskFn = (value: string | null | undefined) => string;

/**
 * Returns the raw value when the operator has `VIEW-PII` on `resource`, or
 * the masked variant otherwise. Handles `null` / `undefined` gracefully.
 */
export function pii(
  value: string | null | undefined,
  resource: ResourceCode,
  mask: MaskFn
): string {
  if (value === null || value === undefined || value === "") {
    return value ?? "";
  }
  return canViewPII(resource) ? String(value) : mask(value);
}
