import { CURRENT_SCHEMA_VERSION, type Project } from '../types';

/**
 * Every persisted project carries schemaVersion. When the Project shape
 * changes in a future release, add a `case N:` step below that mutates the
 * document forward one version at a time — never rewrite older cases, only
 * append new ones. This keeps old show files loadable indefinitely.
 */
export function migrateProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== 'object') return null;
  const doc = raw as Project;
  let version = doc.schemaVersion ?? 0;

  // eslint-disable-next-line no-constant-condition
  while (version < CURRENT_SCHEMA_VERSION) {
    switch (version) {
      // case 0: /* v0 -> v1 migration would go here */ version = 1; break;
      default:
        version = CURRENT_SCHEMA_VERSION;
    }
  }

  return { ...doc, schemaVersion: CURRENT_SCHEMA_VERSION };
}
