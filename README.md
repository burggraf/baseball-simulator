# Bayesian Baseball Simulator

Ultra-realistic, text-based baseball simulation that runs entirely in the browser.

Data is streamed from Retrosheet-derived Parquet files with DuckDB WASM and cached locally with persistent SQLite WASM.

---

## ✨ Goals (MVP)
1. Static SvelteKit 5 site (shadcn-svelte + TailwindCSS) deployed to Cloudflare Pages.
2. Query remote Parquet to import a full MLB season (starting with 2016).
3. Persist imported data and game state in `bbsim.db` (IndexedDB/OPFS).
4. Bayesian batter-pitcher model to simulate a complete 9-inning game.
5. Friendly UI: team selection → lineup → play-by-play narration.

## 📦 Tech Stack
| Area | Choice |
| ---- | ------ |
| Front-end | SvelteKit 5, shadcn-svelte, TailwindCSS |
| Data query | DuckDB WASM (MVP bundle) |
| Persistence | sqlite-wasm (IndexedDB backed) |
| Hosting | Cloudflare Pages (static) |

## ✅ Current Status (2025-06-15)
- SvelteKit project scaffolded with static adapter (`/build`).
- TailwindCSS & shadcn-svelte configured.
- DuckDB WASM demo working; CORS handled via manual Parquet fetch.
- DuckDB and SQLite WASM binaries served locally (`static/duckdb/`, `static/wasm/`).
- Helper modules `@/db/duckdb` and `@/db/sqlite` centralise DB init.
- 2016 `people` table imported → 1 353 rows in persistent `bbsim.db`.
- Import page skips work if data already present.

**Next up:** define schemas & import routines for teams, seasons, games; build UI components.

## 🚀 Running Locally
```bash
npm install         # install deps
npm run dev         # start Vite dev server (http://localhost:5173)
```
First visit to `/import-people` will download Parquet and populate SQLite; later visits detect cached data.

## 🗂️ Key Directories
```
static/duckdb/     – local DuckDB MVP bundle (wasm + worker)
static/wasm/       – sqlite-wasm binary
src/lib/db/        – DB helper modules
src/routes/        – SvelteKit pages
```

---
MIT © 2025 Baseball Simulator Project

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
