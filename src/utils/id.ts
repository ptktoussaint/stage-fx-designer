import { v4 as uuidv4 } from 'uuid';

export function createId(): string {
  return uuidv4();
}

/**
 * Computes the next auto-generated display name for a device prefix,
 * e.g. existingNames=["FIRE 01","FIRE 02"] + prefix "FIRE" -> "FIRE 03".
 * The visual name is purely cosmetic; it never becomes the device's id.
 */
export function nextInstanceName(prefix: string, existingNames: string[]): string {
  const pattern = new RegExp(`^${prefix}\\s(\\d+)$`);
  let max = 0;
  for (const name of existingNames) {
    const match = pattern.exec(name);
    if (match) {
      max = Math.max(max, parseInt(match[1], 10));
    }
  }
  const next = max + 1;
  return `${prefix} ${String(next).padStart(2, '0')}`;
}
