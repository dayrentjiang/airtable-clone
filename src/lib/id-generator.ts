import { createId } from "@paralleldrive/cuid2";

/**
 * Generates a unique row ID on the client
 *
 * Uses cuid2 to generate IDs that match the format Prisma uses,
 * allowing optimistic updates without temporary IDs.
 */
export function generateRowId(): string {
  return createId();
}
