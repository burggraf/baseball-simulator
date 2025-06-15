import * as duckdb from '@duckdb/duckdb-wasm';

// Use the "eh" (everything + httpfs) bundle from jsDelivr CDN for now.
// Later we can mirror these files under /static/duckdb for offline use.
const BUNDLE_PROMISE = (async () => {
  const bundles = duckdb.getJsDelivrBundles();
  // Use library helper to select best bundle for current environment (avoids pthread issues)
  return await duckdb.selectBundle(bundles);
})();

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;

/**
 * Lazily instantiate (and memoise) a single AsyncDuckDB instance configured
 * to use the local MVP WASM bundle. Subsequent calls return the same DB.
 */
export async function getDuckDB(): Promise<duckdb.AsyncDuckDB> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const bundle = await BUNDLE_PROMISE;
      const worker = await duckdb.createWorker(bundle.mainWorker!);
      const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
      await db.instantiate(bundle.mainModule!, bundle.pthreadWorker ?? null);
      // Enable HTTPFS extension if API available; some bundles have it preloaded
      // @ts-ignore - runtime feature test
      if (typeof (db as any).registerExtension === 'function') {
        await (db as any).registerExtension('httpfs');
      }

      return db;
    })();
  }
  return dbPromise;
}
