import { createId } from "@paralleldrive/cuid2";

/**
 * Generates a unique row ID compatible with database constraints
 *
 * Uses cuid2 by default (same format as Prisma @default(cuid()))
 * This allows clients to generate IDs upfront for optimistic updates.
 */
export function generateRowId(): string {
  return createId();
}

/**
 * Validates that an ID looks valid (basic sanity check)
 */
export function isValidRowId(id: string): boolean {
  return id.length >= 10 && id.length <= 50 && /^[a-z0-9]+$/i.test(id);
}
