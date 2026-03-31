# Cache Keepers Web (Interactive Cache Simulator Game)

A browser-based game that helps students understand cache simulation concepts from `sim_cache.cpp` by stepping through memory traces visually.

## Features

- Interactive `L1`/`L2` cache visualization (sets, ways, valid/dirty, tag, address).
- Configurable parameters (`BLOCKSIZE`, sizes, associativity, replacement, inclusion).
- Step-by-step or run-all execution of trace requests.
- Live scoreboard with simulator-style counters (`a` through `m`).
- Event log that explains hits, misses, and writebacks.
- Starter trace preloaded for classroom use.

## Project Files

- `index.html`: App shell and controls.
- `styles.css`: UI styling.
- `app.js`: Browser logic and rendering.
- `sim-core.js`: Simulation engine reused by UI and tests.
- `data/starter-trace.txt`: Starter trace deck.
- `tests/sim-core.test.js`: Tiny validation harness for expected counters.

## Run Locally

From `computer-architecture/cache-simlulator/game-web`:

```zsh
npm run start
```

Then open:

- `http://localhost:8080/index.html`

## Validate Logic

```zsh
npm run check
npm test
```

The test asserts expected metrics for the starter trace with:

- `BLOCKSIZE=4`
- `L1_SIZE=16`
- `L1_ASSOC=2`
- `L2_SIZE=0`
- `replacement=LRU`

## Classroom Flow

1. Load starter trace.
2. Predict hit/miss before each step.
3. Step one request at a time and discuss set/tag mapping.
4. Compare final counters and miss rate.
5. Enable `L2` and replay to show traffic changes.

## Deploy on GitHub Pages

A workflow is already included at:

- `.github/workflows/deploy-game-web-pages.yml`

One-time setup on GitHub:

1. Push your latest `main` branch.
2. Open your repo on GitHub → **Settings** → **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Go to **Actions** tab and run (or wait for) **Deploy Cache Keepers to GitHub Pages**.

Your site URL will be:

- `https://mepawarshivam.github.io/ucf/`

Notes:

- The workflow publishes the folder `computer-architecture/cache-simlulator/game-web`.
- Any push that changes files in that folder auto-triggers a redeploy.
