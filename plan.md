# Baseball Simulation Game Plan

## Notes
- Static web game built with Svelte 5 and shadcn-svelte UI library.
- Will be compiled to a fully static site and deployed on Cloudflare Pages (no server-side code).
- Game data fetched on-the-fly from Retrosheet-derived Parquet files exposed at baseball.computer using DuckDB WASM.
- Local persistence handled with SQLite WASM (sql.js) for both imported data and ongoing season/game state.
- Simulation of each play is Bayesian; up to three segments per matchup: pre-plate, plate, post.
- MVP scope: basic batter-pitcher model; refine later with base-running and fielding.
- User flow: pick teams → pick line-ups & starters → simulate game via text narration.
- Build output directory should be /build (Cloudflare Pages requirement).
- Added path alias `@/*` → `./src/lib/*` in svelte.config.js.
- Initialized shadcn-svelte CLI with defaults (Slate color, default import aliases).
- Added DuckDB demo page `/src/routes/duckdb-demo/+page.svelte` scaffolding.
- Demo updated to use `duckdb.createWorker` and fetch/register Parquet buffer to avoid CORS issues.

## Task List
- [x] Bootstrap SvelteKit 5 project (sv create) with shadcn-svelte, TailwindCSS, and adapter-static (output to /build).
  - [x] Create SvelteKit skeleton (`sv create`)
  - [x] Add TailwindCSS plugin (`sv add tailwindcss`)
  - [x] Run `shadcn-svelte init` and configure paths
  - [x] Install & configure `@sveltejs/adapter-static` with outDir `/build`
- [ ] Configure CI pipeline for Cloudflare Pages build & deploy.
- [ ] Integrate DuckDB WASM; query a remote Parquet file successfully.
  - [x] Scaffold demo page `duckdb-demo/+page.svelte`
  - [x] Install `@duckdb/duckdb-wasm` package
  - [x] Handle CORS by fetching Parquet & registering buffer
  - [ ] Run in browser and verify query
- [ ] Write DuckDB queries to extract one season of player/team statistics.
- [ ] Integrate SQLite WASM; design schema for players, teams, games, seasons.
- [ ] Transfer extracted data into SQLite store for offline/fast access.
- [ ] Build UI component for team selection using shadcn-svelte.
- [ ] Build UI screens for lineup and starting-pitcher selection.
- [ ] Implement basic Bayesian batter-pitcher model returning plate-appearance outcome probabilities.
- [ ] Simulate a single plate appearance and display textual result.
- [ ] Loop to simulate a full 9-inning game with simplified model; show play-by-play text.
- [ ] Persist game state to SQLite; allow saving and resuming games.
- [ ] Extend model with pre-plate events (steals, pickoffs) and post-plate runner advancement.
- [ ] Test and calibrate model probabilities against historical stats.
- [ ] Polish UI/UX and handle edge cases & errors.

## Current Goal
Integrate DuckDB WASM and query a remote Parquet file successfully.