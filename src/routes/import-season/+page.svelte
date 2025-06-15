<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  // Helper to lazy-load our db wrappers (avoids SSR issues)
  let duck: any;         // DuckDB wasm module
  let connDuck: any;     // DuckDB connection
  let runSqlite: any;    // sqlite-wasm run helper

  // Progress state
  const status = writable<string>('');
  const tableStatus = writable<Record<string,string>>({});
  const season = 2016;   // TODO: parameterise later

  /**
   * Minimal metadata for each Parquet model that contains a `season` column.
   * Extend this list easily – each object just needs a "name" and "url".
   */
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  type Model = { name: string; url: string; hasEventKey?: boolean };
  const models: Model[] = [
    { name: 'calc_park_factors_advanced', url: `${base}/data/dbt/main_models_calc_park_factors_advanced.parquet` },
    { name: 'calc_park_factors_basic',    url: `${base}/data/dbt/main_models_calc_park_factors_basic.parquet` },
    { name: 'event_fielding_stats',       url: `${base}/data/dbt/main_models_event_fielding_stats.parquet`, hasEventKey: true },
    { name: 'event_transition_values',    url: `${base}/data/dbt/main_models_event_transition_values.parquet` },
    { name: 'event_states_full',          url: `${base}/data/dbt/main_models_event_states_full.parquet` },
    { name: 'game_results',               url: `${base}/data/dbt/main_models_game_results.parquet` },
    { name: 'game_scorekeeping',          url: `${base}/data/dbt/main_models_game_scorekeeping.parquet` },
    { name: 'game_start_info',            url: `${base}/data/dbt/main_models_game_start_info.parquet` },
    { name: 'linear_weights',             url: `${base}/data/dbt/main_models_linear_weights.parquet` }
  ];

  /**
   * Utility: create a SQLite table if not exists using column names inferred from first batch.
   */
  async function ensureSqliteTable(table: string, cols: string[]) {
    const colDefs = cols.map((c) => `\`${c}\``).join(',');
    await runSqlite(`CREATE TABLE IF NOT EXISTS \`${table}\` (${colDefs});`);
  }

  /** Run full import */
  async function importSeason() {
    status.set('Loading database engines…');

    if (!duck) {
      const { getDuckDB } = await import('@/db/duckdb');
      duck = await getDuckDB();
      connDuck = await duck.connect();
    }
    if (!runSqlite) {
      const { getSQLite } = await import('@/db/sqlite');
      ({ run: runSqlite } = await getSQLite());
    }

    const BATCH_SIZE = 10;

    for (const m of models) {
      let lastEventKey = -1;
      // Skip if table already has rows for this season
      try {
        const existsRes = await runSqlite(`SELECT count(*) as cnt FROM sqlite_master WHERE type='table' AND name='${m.name}';`);
        if (existsRes[0].cnt) {
          const already = await runSqlite(`SELECT count(*) as cnt FROM \`${m.name}\` WHERE season = ? LIMIT 1;`, [season]);
          if (already[0]?.cnt > 0) {
            const total = already[0].cnt;
            let remoteCnt: number | null = null;
            try {
              const tbl = await connDuck.query(`SELECT count(*) AS cnt FROM parquet_scan('${m.url}') WHERE season = ${season};`);
              remoteCnt = tbl.toArray()[0].cnt as number;
            } catch (_) {}
            if (remoteCnt !== null && remoteCnt === total) {
              tableStatus.update((s)=>({...s,[m.name]:`skip (${total}/${remoteCnt})`}));
              continue; // data complete
            }
            // mismatch – resume or restart
            if (m.hasEventKey) {
              const maxKeyRes = await runSqlite(`SELECT max(event_key) as max FROM \`${m.name}\` WHERE season = ?;`, [season]);
              lastEventKey = maxKeyRes[0]?.max ?? -1;
              tableStatus.update((s)=>({...s,[m.name]:`resuming (${total}/${remoteCnt ?? '?'})`}));
            } else {
              await runSqlite(`DELETE FROM \`${m.name}\` WHERE season = ?;`, [season]);
              tableStatus.update((s)=>({...s,[m.name]:`reimporting (was ${total}/${remoteCnt ?? '?'})`}));
            }
          }
        }
      } catch (_) {/* table may not exist yet */}

      tableStatus.update((s) => ({ ...s, [m.name]: 'querying' }));
      let inserted = 0;
      // lastEventKey may have been set if resuming; initialise to -1 only if still unset
      if (lastEventKey === -1) lastEventKey = -1;
      let batchRowsCount = 0;

      const runBatch = async () => {
        const sql = m.hasEventKey
          ? `SELECT * FROM parquet_scan('${m.url}') WHERE season = ${season} AND event_key > ${lastEventKey} ORDER BY event_key LIMIT ${BATCH_SIZE};`
          : `SELECT * FROM parquet_scan('${m.url}') WHERE season = ${season};`;
        console.log(`querying: ${m.name} - ${m.url}`);
        console.log(sql);
        console.log('waiting...')
        const result = await connDuck.send(sql);
        console.log('got result', result);
        return result;
      };

      let stream = await runBatch();
      console.log(`batch completed: ${m.name} - ${m.url}`);
      for await (const batch of stream) {
        const rows = batch.toArray();
        batchRowsCount = rows.length;
        if (inserted === 0 && rows.length) {
          await ensureSqliteTable(m.name, Object.keys(rows[0]));
        }
        const placeholders = rows[0] ? '(?' + ',?'.repeat(Object.keys(rows[0]).length - 1) + ')' : '();';
        const stmt = `INSERT OR IGNORE INTO \`${m.name}\` VALUES ${placeholders};`;
        for (const row of rows) {
          const vals = Object.values(row).map((v)=>{
            if (typeof v === 'bigint') return Number(v);
            if (v === undefined) return null;
            if (ArrayBuffer.isView(v)) return (v as any)[0] ?? null;
            if (typeof v === 'object' && v !== null) return v.toString();
            return v;
          });
          await runSqlite(stmt, vals);
          inserted++;
          if (m.hasEventKey) lastEventKey = row.event_key as number;
        }
        if (inserted % BATCH_SIZE === 0) {
          tableStatus.update((s) => ({ ...s, [m.name]: `inserted ${inserted}` }));
        }
      }
      // fetch next batch if needed
      if (m.hasEventKey && batchRowsCount === BATCH_SIZE) {
        stream = await runBatch();
        continue;
      }
      tableStatus.update((s) => ({ ...s, [m.name]: `done (${inserted})` }));
    }
    status.set('All tables finished.');
  }

  onMount(() => {
    importSeason();
  });
</script>

<h1 class="text-xl font-bold mb-4">Import season {season} tables</h1>
<p>{$status}</p>
<ul>
  {#each Object.entries($tableStatus) as [tbl, stat]}
    <li>{tbl}: {stat}</li>
  {/each}
</ul>
