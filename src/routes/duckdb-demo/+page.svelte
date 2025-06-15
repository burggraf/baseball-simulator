<script lang="ts">
  import { onMount } from 'svelte';

  let rows: any[] = [];
  let loading = true;
  let error: string | null = null;



  onMount(async () => {
    try {
      const { getDuckDB } = await import('@/db/duckdb');
      const db = await getDuckDB();

      const conn = await db.connect();
      const parquetUrl = 'https://data.baseball.computer/dbt/main_models_metrics_player_season_league_offense.parquet';
      const resp = await fetch(parquetUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching parquet`);
      const buf = await resp.arrayBuffer();
      const fileName = 'league_offense.parquet';
      await db.registerFileBuffer(fileName, new Uint8Array(buf));
      const result = await conn.query(`SELECT * FROM '${fileName}' LIMIT 5;`);
      rows = result.toArray();
    } catch (e: any) {
      error = e?.message ?? 'Unknown error';
      console.error(e);
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>DuckDB WASM Demo</title>
</svelte:head>

<div class="p-4 space-y-4">
  <h1 class="text-2xl font-semibold">DuckDB Parquet Demo</h1>

  {#if loading}
    <p>Loading DuckDB &amp; querying data…</p>
  {:else if error}
    <p class="text-red-600">Error: {error}</p>
  {:else}
    <table class="table-auto border-collapse border border-slate-400">
      <thead>
        <tr>
          {#each Object.keys(rows[0] ?? {}) as col}
            <th class="border border-slate-300 px-2 py-1 text-left">{col}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as row}
          <tr>
            {#each Object.values(row) as cell}
              <td class="border border-slate-300 px-2 py-1 text-sm">{cell}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
