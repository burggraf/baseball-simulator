<script lang="ts">
  import { onMount } from 'svelte';
  let status: string = 'Starting import…';
  let count = 0;

  onMount(async () => {
    // First attempt to open existing SQLite DB and check if people table already populated
    try {
      const { initSQLite } = await import('@subframe7536/sqlite-wasm');
      const { useIdbMemoryStorage } = await import('@subframe7536/sqlite-wasm/idb-memory');
      const wasmUrl = '/wasm/wa-sqlite-async.wasm';
      const dbApiEarly = await initSQLite(useIdbMemoryStorage('bbsim.db', { url: wasmUrl }));
      const { run: runEarly, close: closeEarly } = dbApiEarly;
      const tableExists = (await runEarly("SELECT count(*) as cnt FROM sqlite_master WHERE type='table' AND name='people';"))[0]?.cnt === 1;
      if (tableExists) {
        const existing = (await runEarly('SELECT count(*) as cnt FROM people;'))[0]?.cnt ?? 0;
        if (existing > 0) {
          count = existing;
          status = `People already present in SQLite (rows: ${existing}). Skipping import.`;
          await closeEarly();
          return;
        }
      }
      await closeEarly();
    } catch (e) {
      console.warn('SQLite pre-check failed, will proceed with import', e);
    }
    try {
      status = 'Loading DuckDB…';
      const { getDuckDB } = await import('@/db/duckdb');
      const db = await getDuckDB();

      // Fetch parquet files manually to bypass CORS and register buffers
      status = 'Fetching Parquet files…';
      const peopleUrl = 'https://data.baseball.computer/dbt/main_models_people.parquet';
      const eventsUrl = 'https://data.baseball.computer/dbt/main_models_event_states_full.parquet';

      const [peopleBuf, eventsBuf] = await Promise.all([
        fetch(peopleUrl).then(r => r.arrayBuffer()),
        fetch(eventsUrl).then(r => r.arrayBuffer())
      ]);
      await db.registerFileBuffer('people.parquet', new Uint8Array(peopleBuf));
      await db.registerFileBuffer('events.parquet', new Uint8Array(eventsBuf));

      const conn = await db.connect();
      status = 'Building DuckDB views…';
      await conn.query("CREATE VIEW people AS SELECT * FROM 'people.parquet';");
      await conn.query("CREATE VIEW events_raw AS SELECT * FROM 'events.parquet';");
      await conn.query("CREATE VIEW events AS SELECT * FROM events_raw WHERE season = 2016;");

      // Dynamically find all *_id columns in events to collect person ids
      status = 'Determining ID columns…';
      const colsRes = await conn.query("PRAGMA table_info('events');");
      const idCols = colsRes.toArray().map((r: any) => r.name).filter((n: string) => n.endsWith('_id'));
      if (idCols.length === 0) throw new Error('No *_id columns found in events');

      status = 'Querying distinct people for 2016…';
      const unions = idCols.map((c) => `SELECT ${c} AS person_id FROM events`).join(' UNION ');
      const sql = `WITH ids AS (${unions}) SELECT p.* FROM people p JOIN ids i USING (person_id);`;
      const result = await conn.query(sql);
      const rows = result.toArray();
      count = rows.length;

      // Persist rows using sqlite-wasm (OPFS/IndexedDB backed)
      status = 'Persisting to SQLite…';
      // Persist rows using sqlite-wasm IDB/OPFS storage
      const { getSQLite } = await import('@/db/sqlite');
      const { run, close } = await getSQLite();

      // Dynamically create table schema if it doesn't exist
      const cols = Object.keys(rows[0]);
      const colDDL = cols.map((c) => `\"${c}\" TEXT`).join(', ');
      await run(`CREATE TABLE IF NOT EXISTS people (${colDDL}, PRIMARY KEY(person_id));`);
      await run('BEGIN');
      for (const row of rows) {
        const placeholders = cols.map(() => '?').join(',');
        await run(`INSERT OR IGNORE INTO people VALUES (${placeholders});`, cols.map((c: string) => row[c]));
      }
      await run('COMMIT');
      await close();
      status = `Imported ${count} people into persistent SQLite (bbsim.db).`;
    } catch (err) {
      console.error(err);
      status = 'Error: ' + (err as Error).message;
    }
  });
</script>

<svelte:head>
  <title>Import 2016 People</title>
</svelte:head>

<div class="p-4 space-y-2">
  <h1 class="text-xl font-semibold">Import 2016 People into SQLite</h1>
  <p>{status}</p>
  {#if count}
    <p>Total people rows: {count}</p>
  {/if}
</div>
