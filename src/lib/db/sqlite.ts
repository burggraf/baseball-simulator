import { initSQLite } from '@subframe7536/sqlite-wasm';
import { useIdbMemoryStorage } from '@subframe7536/sqlite-wasm/idb-memory';

const wasmUrl = '/wasm/wa-sqlite-async.wasm';

let apiPromise: ReturnType<typeof initSQLite> | null = null;

/**
 * Lazily open (and memoise) the persistent IndexedDB-backed SQLite database.
 */
export async function getSQLite() {
  if (!apiPromise) {
    apiPromise = initSQLite(useIdbMemoryStorage('bbsim.db', { url: wasmUrl }));
  }
  return apiPromise;
}
