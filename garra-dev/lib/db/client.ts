import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import * as schema from './schema';

// One shared connection — every query/mutation hook imports this, never opens its own.
const sqlite = openDatabaseSync('garra.db');

export const db = drizzle(sqlite, { schema });
