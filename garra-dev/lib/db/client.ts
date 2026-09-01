import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import * as schema from './schema';

// One shared connection — every query/mutation hook imports this, never opens its own.
const sqlite = openDatabaseSync('garra.db');

export const db = drizzle(sqlite, { schema });

/**
 * SQLite ships with foreign-key enforcement OFF, per connection, so the schema's
 * `references(...)` declarations are otherwise decoration — a deleted arc would leave orphaned
 * goals and entries behind, with no local counterpart to the remote ON DELETE CASCADE
 * (05-database.md §3 requires the two schemas to stay structurally identical).
 *
 * Deliberately **not** called at module load: `PRAGMA foreign_keys` is per-connection and
 * persists for its lifetime, and Drizzle's table-recreate migrations (`0003`) drop and rebuild
 * parent tables. With enforcement already on, `DROP TABLE goals` would either fail on a child
 * constraint or cascade-delete every entry and checkpoint. So migrations run with SQLite's
 * default (off), and `app/_layout.tsx` calls this once they've reported success.
 */
export function enableForeignKeys() {
  sqlite.execSync('PRAGMA foreign_keys = ON;');
}
