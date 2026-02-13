# System Design Concepts

Interactive visualizations of common system design patterns, built as a micro-frontend monorepo with Svelte 5 and Vite.

Each app is a standalone demo that lets you experiment with a specific concept — tweak parameters, send requests, and watch the algorithm respond in real time.

## Apps

| App | Description | Port |
| --- | --- | --- |
| **Rate Limiter** | Token bucket, fixed window, sliding window, and leaky bucket algorithms | 5174 |
| **Cache Invalidation** | Cache eviction and invalidation strategies | 5175 |
| **Proxy Patterns** | Forward, reverse, and load-balancing proxy patterns | 5176 |
| **Queue Workers** | Message queues and worker processing patterns | 5177 |
| **Offline First** | Offline-first data sync and conflict resolution patterns | 5178 |

## Tech Stack

- **Svelte 5** — UI framework with runes
- **Vite 7** — dev server and bundler
- **Turborepo** — monorepo task orchestration
- **pnpm** — package manager
- **Caddy** — reverse proxy to unify apps under one port in dev
- **Biome** — linting and formatting

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v10+)
- [Docker](https://www.docker.com/) (optional, for the Caddy reverse proxy)

### Install dependencies

```sh
pnpm install
```

### Run all apps

```sh
pnpm dev
```

This starts every app in parallel via Turborepo. Each app runs on its own port (5174–5178).

### Run a single app

```sh
pnpm --filter @system-design-monorepo/rate-limiter dev
```

Replace `@system-design-monorepo/rate-limiter` with the app's package name (e.g. `@system-design-monorepo/cache-invalidation`).

### Unified gateway (optional)

To access all apps through a single port (`localhost:5173`) using Caddy as a reverse proxy:

```sh
docker compose up -d
pnpm dev
```

Then visit:

- `http://localhost:5173/rate-limiter/`
- `http://localhost:5173/cache-invalidation/`
- `http://localhost:5173/proxy-patterns/`
- `http://localhost:5173/queue-workers/`
- `http://localhost:5173/offline-first/`

## Deploying to Cloudflare Pages

Each app can be deployed as its own Cloudflare Pages project. Since these are static Svelte SPAs, no server-side runtime is needed.

### Via the Cloudflare dashboard

1. Connect your repository in the [Cloudflare Pages dashboard](https://dash.cloudflare.com/?to=/:account/pages/new/provider/github).
2. Configure the build settings for the app you want to deploy:

| Setting | Value |
| --- | --- |
| **Build command** | `pnpm install && pnpm --filter @system-design-monorepo/<app-name> build` |
| **Build output directory** | `apps/<app-name>/dist` |
| **Root directory** | `/` |

3. Add the environment variable `NODE_VERSION` set to `18` (or higher).
4. If the app is served at the root of its domain (not under a subpath), add `VITE_BASE=/` as an environment variable and update the build command to: `pnpm install && pnpm --filter @system-design-monorepo/<app-name> build -- --base=/`

### Via Wrangler CLI

```sh
# Build the app
pnpm --filter @system-design-monorepo/rate-limiter build -- --base=/

# Deploy
npx wrangler pages deploy apps/rate-limiter/dist --project-name=rate-limiter
```

Repeat for each app, replacing the filter name and directory accordingly.

## Project Structure

```
apps/
  rate-limiter/         # Rate limiting algorithms
  cache-invalidation/   # Cache strategies
  proxy-patterns/       # Proxy pattern demos
  queue-workers/        # Queue and worker demos
  offline-first/        # Offline-first patterns
packages/
  ui/                   # Shared UI components
```
