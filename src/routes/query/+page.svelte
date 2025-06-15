<script lang="ts">
  export const ssr = false;
  import { onMount } from 'svelte';


  // SQL text entered by the user
  let sql = 'SELECT name FROM sqlite_master LIMIT 10;';

  // Query result rows (array of objects)
  let rows: Record<string, any>[] = [];
  let error = '';

  // SQLite helper function loaded lazily (kept across HMR reloads)
  let runSql: (sql: string, params?: any[]) => Promise<any[]>;

  onMount(async () => {
    const { getSQLite } = await import('@/db/sqlite');
    const { run } = await getSQLite();
    runSql = run;
  });

  async function execute() {
    if (!runSql) return;
    error = '';
    rows = [];
    try {
      rows = await runSql(sql);
    } catch (e: any) {
      error = e?.message ?? String(e);
    }
  }
</script>

<svelte:head>
  <title>SQLite Query Console</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-4">SQLite Query Console</h1>

<label for="sqlbox" class="font-semibold mb-1 block">SQL</label>
<textarea id="sqlbox" class="w-full h-32 mb-4 font-mono border rounded p-2" bind:value={sql}></textarea>
<button on:click={execute} class="mb-4 px-3 py-1 rounded bg-slate-600 text-white hover:bg-slate-700">Run</button>

{#if error}
  <p class="text-red-600 mb-4">{error}</p>
{/if}

{#if rows.length}
  <div class="overflow-x-auto border rounded">
    <table class="min-w-full text-sm">
      <thead class="bg-slate-100">
        <tr>
          {#each Object.keys(rows[0]) as col}
            <th class="px-3 py-2 text-left whitespace-nowrap border-b">{col}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as row}
          <tr class="odd:bg-white even:bg-slate-50">
            {#each Object.keys(rows[0]) as col}
              <td class="px-3 py-2 whitespace-nowrap border-b">{row[col]}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
