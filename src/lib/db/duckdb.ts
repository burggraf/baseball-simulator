import * as duckdb from '@duckdb/duckdb-wasm';

// Local bundle (minimal MVP build) paths served from /static/duckdb
const LOCAL_BUNDLE = {
  mainModule: `${location.origin}/duckdb/duckdb-mvp.wasm`,
  mainWorker: '/duckdb/duckdb-browser-mvp.worker.js',
  pthreadWorker: undefined as string | undefined
};

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;

/**
 * Lazily instantiate (and memoise) a single AsyncDuckDB instance configured
 * to use the local MVP WASM bundle. Subsequent calls return the same DB.
 */
export async function getDuckDB(): Promise<duckdb.AsyncDuckDB> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const worker = await duckdb.createWorker(LOCAL_BUNDLE.mainWorker);
      const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
      await db.instantiate(LOCAL_BUNDLE.mainModule, null);
      return db;
    })();
  }
  return dbPromise;
}
